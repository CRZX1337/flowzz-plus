#!/usr/bin/env python3
"""flowzz+ Attribut-Index-Crawler.

Quelle: /api/v1/views/<cat>/<slug> – dieselbe JSON-API wie die Website, liefert
die kompletten Attribute (Effekte, Geschmack, medizinische Wirkung,
Nebenwirkungen, Terpene). Kein HTML-Parsing, keine Blockade.

Ausgabe:
  dist/attrs.json.gz        { version, catalog, labels, products }
  dist/attrs.meta.json      Coverage-Report
  dist/vendors.json         Apothekenstammdaten (falls vorhanden)
  data/attrs-progress.json  Resume-Zustand

Beispiel:
  python3 tools/crawl-attributes.py                # Delta, 4 req/s
  python3 tools/crawl-attributes.py --fresh        # alles neu
  python3 tools/crawl-attributes.py --limit 50     # Test
"""
import argparse
import gzip
import json
import os
import random
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      'Accept': 'application/json'}
BASE = 'https://flowzz.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
DIST = os.path.join(ROOT, 'dist')
PROGRESS = os.path.join(DATA, 'attrs-progress.json')
CATS = ['flowers', 'extracts', 'edibles']
TYPE_KEY = {'effect': 'e', 'taste': 't', 'medicalUsage': 'm', 'sideEffects': 's'}

lock = threading.Lock()
stats = {'ok': 0, 'fail': 0, 'http_429': 0}
RPS = 2.0
RPS_MIN = 0.5
_cooldown = [0.0]
_next_slot = [0.0]


def log(*a):
    print(*a, flush=True)


def rate_limit():
    while True:
        with lock:
            now = time.time()
            wait = max(0.0, _next_slot[0] - now, _cooldown[0] - now)
            if wait <= 0:
                _next_slot[0] = now + 1.0 / RPS
                return
        time.sleep(min(wait, 0.25))


def penalize(seconds):
    """429: Cooldown setzen und Rate halbieren (max. 0.5 req/s)."""
    global RPS
    with lock:
        until = time.time() + seconds
        if until > _cooldown[0]:
            _cooldown[0] = until
        RPS = max(RPS_MIN, RPS * 0.6)


def get_json(path, tries=4):
    last = None
    for attempt in range(tries):
        rate_limit()
        try:
            req = urllib.request.Request(BASE + path, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, json.loads(r.read().decode('utf-8', 'ignore'))
        except urllib.error.HTTPError as e:
            last = e.code
            if e.code in (429, 503, 502):
                with lock:
                    stats['http_429'] += 1
                wait = 8 * (attempt + 1) + random.uniform(0, 3)
                penalize(wait)
                log(f'  ! HTTP {e.code} – Cooldown {wait:.0f}s')
                time.sleep(wait)
                continue
            return e.code, None
        except Exception as e:
            last = str(e)
            time.sleep(1.5 + attempt)
    return f'ERR:{last}', None


def fetch_catalog(cat):
    out, page = [], 1
    while True:
        st, body = get_json(f'/api/v1/views/{cat}?pagination%5BpageSize%5D=240&pagination%5Bpage%5D={page}')
        if st != 200 or not body:
            log(f'  Listenfehler {cat} Seite {page}: {st}')
            break
        payload = body['data']
        out += payload['data']
        pag = payload['meta']['pagination']
        log(f'  {cat}: Seite {page}/{pag["pageCount"]} – {len(out)}/{pag["total"]}')
        if not pag.get('hasNextPage'):
            break
        page += 1
        time.sleep(0.3)
    return out


def parse_attrs(attrs):
    """Attribute + Labels aus einem Produktobjekt der API-Detailroute."""
    strain = ((attrs.get('strain') or {}).get('data') or {}).get('attributes') or {}
    raw = ((strain.get('strain_attributes') or {}).get('data')) or []
    terpenes = ((attrs.get('terpenes') or {}).get('data')) or []

    keys, labels = {}, {}
    for a in raw:
        info = a.get('attributes') or {}
        key = TYPE_KEY.get(info.get('type'))
        if not key:
            continue
        aid = int(a.get('id'))
        keys.setdefault(key, []).append(aid)
        labels[str(aid)] = {'label': info.get('labelDE') or str(aid), 'type': info.get('type')}

    tp = []
    for t in terpenes:
        info = t.get('attributes') or {}
        tid = int(t.get('id'))
        tp.append(tid)
        labels[str(tid)] = {'label': info.get('labelDE') or str(tid), 'type': 'terpene'}
    if tp:
        keys['tp'] = tp

    # Medizinische Anwendungsgebiete/Nebenwirkungen bewusst nicht übernehmen:
    # Community-Tags, keine bestätigten Indikationen.
    keys.pop('m', None)
    keys.pop('s', None)
    for k in keys:
        keys[k] = sorted(set(keys[k]))
    return keys, labels, strain.get('name'), strain.get('url')


def crawl_one(job):
    st, body = get_json(f'/api/v1/views/{job["cat"]}/{job["url"]}')
    if st != 200 or not body or not body.get('data'):
        with lock:
            stats['fail'] += 1
        return job['id'], None, None, f'HTTP {st}'

    attrs = body['data'].get('attributes') or {}
    keys, labels, strain_name, strain_url = parse_attrs(attrs)
    if not keys:
        with lock:
            stats['fail'] += 1
        return job['id'], None, None, 'keine Attribute'

    with lock:
        stats['ok'] += 1
    meta = {
        'name': attrs.get('name'),
        'cat': job['cat'],
        'origin': attrs.get('origin') or '',
        'strain': strain_name,
        'strain_url': strain_url,
    }
    return job['id'], keys, {'labels': labels, 'meta': meta}, None


def load_labelmap():
    p = os.path.join(DATA, 'labelmap.json')
    if os.path.exists(p):
        try:
            with open(p) as f:
                return json.load(f)
        except Exception:
            pass
    return {'strain': {}, 'terp': {}}


def fetch_vendors():
    old = os.path.join(DIST, 'vendors.json')
    if os.path.exists(old):
        try:
            with open(old) as f:
                v = json.load(f)
            if v.get('vendors'):
                log(f'{len(v["vendors"])} Apotheken aus vorhandenem Index übernommen')
                return v['vendors']
        except Exception:
            pass
    log('keine Apothekenquelle verfügbar – vendors.json wird übersprungen')
    return {}


def load_progress():
    if os.path.exists(PROGRESS):
        try:
            with open(PROGRESS) as f:
                return json.load(f)
        except Exception:
            pass
    return {'products': {}, 'labels': {}, 'meta': {}, 'runs': []}


def save_progress(p):
    os.makedirs(DATA, exist_ok=True)
    tmp = PROGRESS + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(p, f, ensure_ascii=False)
    os.replace(tmp, PROGRESS)


def main():
    global RPS
    ap = argparse.ArgumentParser()
    ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--rps', type=float, default=2.0, help='Startrate req/s (adaptiv, Default 2)')
    ap.add_argument('--only', choices=CATS)
    ap.add_argument('--limit', type=int)
    ap.add_argument('--fresh', action='store_true')
    args = ap.parse_args()
    RPS = max(0.5, args.rps)

    os.makedirs(DATA, exist_ok=True)
    os.makedirs(DIST, exist_ok=True)

    progress = {'products': {}, 'labels': {}, 'meta': {}, 'runs': []} if args.fresh else load_progress()
    known = progress['products']

    cats = [args.only] if args.only else CATS
    catalog, jobs, seen = {}, [], set()
    for cat in cats:
        log(f'Lade Katalog {cat} …')
        for p in fetch_catalog(cat):
            pid = str(p['id'])
            catalog[pid] = {
                'slug': p['url'], 'cat': cat, 'name': p.get('name'),
                'origin': p.get('origin') or '', 'producer': p.get('producer_name') or '',
                'thc': p.get('thc'), 'cbd': p.get('cbd'), 'price': p.get('min_price'),
                'avail': p.get('availibility'), 'genetic': p.get('genetic'),
                'rating': p.get('ratings_score'), 'published': p.get('published_at'),
                'irradiated': bool(p.get('irradiated')),
            }
            if pid not in seen:
                seen.add(pid)
                if pid not in known:
                    jobs.append({'id': pid, 'url': p['url'], 'cat': cat})

    vendors = fetch_vendors()
    log(f'{len(catalog)} Produkte im Katalog, {len(jobs)} ohne Attribute')
    if args.limit:
        jobs = jobs[:args.limit]

    if jobs:
        eta = len(jobs) / max(0.5, RPS) / 60
        log(f'Crawle {len(jobs)} Produkte, {args.workers} Worker, {RPS} req/s, ~{eta:.0f} min')
        t0, done = time.time(), 0
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            for pid, keys, extra, err in ex.map(crawl_one, jobs):
                done += 1
                if keys:
                    known[pid] = keys
                    progress['labels'].update(extra['labels'])
                    progress['meta'][pid] = extra['meta']
                if done % 50 == 0 or done == len(jobs):
                    el = time.time() - t0
                    log(f'  {done}/{len(jobs)}  {el:.0f}s  ok={stats["ok"]} '
                        f'fail={stats["fail"]} 429={stats["http_429"]}')
                    save_progress(progress)
        progress['runs'].append({'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                                 'crawled': len(jobs), 'ok': stats['ok'], 'fail': stats['fail'],
                                 'seconds': round(time.time() - t0)})
        save_progress(progress)
    else:
        log('Nichts zu tun – Index ist aktuell.')

    write_outputs(catalog, known, progress, vendors)


def write_outputs(catalog, known, progress, vendors):
    products = {pid: {k: v for k, v in a.items() if k not in ('m', 's')}
                for pid, a in known.items() if pid in catalog}
    labelmap = load_labelmap()
    strain_labels = dict(labelmap.get('strain') or {})
    terp_labels = dict(labelmap.get('terp') or {})
    # Fallback: aus dem Crawl gelernte Labels ergänzen
    for lid, info in (progress.get('labels') or {}).items():
        if not isinstance(info, dict):
            continue
        if info.get('type') == 'terpene':
            terp_labels.setdefault(lid, info.get('label'))
        else:
            strain_labels.setdefault(lid, {'label': info.get('label'), 'type': info.get('type')})
    payload = {
        'version': date.today().isoformat(),
        'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'count': len(products),
        'catalog': catalog,
        'labels': strain_labels,
        'terpLabels': terp_labels,
        'products': products,
    }
    raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()
    out = os.path.join(DIST, 'attrs.json.gz')
    with gzip.open(out, 'wb', compresslevel=9) as f:
        f.write(raw)
    log(f'geschrieben: {out} ({len(raw) / 1024:.0f} KB roh -> {os.path.getsize(out) / 1024:.0f} KB gzip)')

    if vendors:
        vp = os.path.join(DIST, 'vendors.json')
        with open(vp, 'w') as f:
            json.dump({'version': payload['version'], 'vendors': vendors}, f, ensure_ascii=False)
        log(f'geschrieben: {vp} ({os.path.getsize(vp) / 1024:.0f} KB)')

    total = len(catalog)
    cov = {k: 0 for k in ('e', 't', 'tp')}
    for a in products.values():
        for k in cov:
            if a.get(k):
                cov[k] += 1
    report = {
        'version': payload['version'],
        'catalog': total,
        'with_attributes': len(products),
        'coverage_percent': {k: round(100 * v / max(1, total), 1) for k, v in cov.items()},
        'labels': len(strain_labels) + len(terp_labels),
        'gzip_kb': round(os.path.getsize(out) / 1024, 1),
        'raw_kb': round(len(raw) / 1024, 1),
    }
    with open(os.path.join(DIST, 'attrs.meta.json'), 'w') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    log(json.dumps(report, ensure_ascii=False, indent=2))

    if total and len(products) / total < 0.9 and not os.environ.get('FX_PARTIAL'):
        log(f'FEHLER: nur {len(products)}/{total} Produkte haben Attribute – abgebrochen.')
        sys.exit(2)


if __name__ == '__main__':
    main()
