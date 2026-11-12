#!/usr/bin/env python3
"""Phase 0 – Spike: Attributabdeckung auf flowzz-Produktseiten messen."""
import json, re, time, random, sys, urllib.request, urllib.error

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/131.0 Safari/537.36'}

BASE = 'https://flowzz.com'


def get(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, r.read().decode('utf-8', 'ignore')
        except urllib.error.HTTPError as e:
            last = f'HTTP {e.code}'
            if e.code in (429, 503):
                time.sleep(5 * (i + 1))
                continue
            return e.code, ''
        except Exception as e:
            last = str(e)
            time.sleep(2)
    return 'ERR', str(last)


def list_products(cat='flowers', pages=2):
    out = []
    for p in range(1, pages + 1):
        st, body = get(f'{BASE}/api/v1/views/{cat}?pagination%5BpageSize%5D=100&pagination%5Bpage%5D={p}')
        if st != 200:
            print('list error', st, file=sys.stderr)
            break
        d = json.loads(body)['data']
        out += d['data']
        if not d['meta']['pagination']['hasNextPage']:
            break
        time.sleep(0.5)
    return out


def next_data(html):
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except Exception:
        return None


def parse_product(slug):
    st, html = get(f'{BASE}/product/{slug}')
    if st != 200:
        return {'slug': slug, 'status': st}
    d = next_data(html)
    if not d:
        return {'slug': slug, 'status': 'no_next_data'}
    try:
        attrs = d['props']['pageProps']['pageContext']['product']['attributes']
    except Exception:
        return {'slug': slug, 'status': 'no_product_attrs'}

    strain = (attrs.get('strain') or {}).get('data', {}).get('attributes', {}) or {}
    sa = ((strain.get('strain_attributes') or {}).get('data')) or []
    terp = ((attrs.get('terpenes') or {}).get('data')) or []

    by_type = {}
    for a in sa:
        t = a.get('attributes', {}).get('type', '?')
        by_type[t] = by_type.get(t, 0) + 1

    return {
        'slug': slug,
        'status': 'ok',
        'id': attrs.get('id'),
        'name': attrs.get('name'),
        'origin': attrs.get('origin') or '',
        'n_attrs': len(sa),
        'by_type': by_type,
        'n_terpenes': len(terp),
        'terpene_total': attrs.get('terpeneTotal'),
        'terpene_shares': len(attrs.get('terpeneShares') or []),
        'strain_id': attrs.get('strain_id'),
        'bytes': len(html),
    }


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 40
    prods = list_products('flowers', 2)
    print(f'Katalog: {len(prods)} Blüten in Stichprobe verfügbar')
    random.seed(42)
    sample = prods[:8] + random.sample(prods[8:], min(n - 8, len(prods) - 8))

    results = []
    t0 = time.time()
    for i, p in enumerate(sample, 1):
        r = parse_product(p['url'])
        results.append(r)
        if i % 10 == 0:
            el = time.time() - t0
            print(f'  {i}/{len(sample)}  {el:.0f}s  ({el / i:.2f}s/Seite)', flush=True)
        time.sleep(0.7)

    ok = [r for r in results if r['status'] == 'ok']
    total = len(results)
    with_effects = [r for r in ok if r['by_type'].get('effect')]
    with_taste = [r for r in ok if r['by_type'].get('taste')]
    with_med = [r for r in ok if r['by_type'].get('medicalUsage')]
    with_side = [r for r in ok if r['by_type'].get('sideEffects')]
    with_terp = [r for r in ok if r['n_terpenes']]
    avg_attrs = sum(r['n_attrs'] for r in ok) / len(ok) if ok else 0
    avg_terp = sum(r['n_terpenes'] for r in ok) / len(ok) if ok else 0
    avg_bytes = sum(r['bytes'] for r in ok) / len(ok) if ok else 0

    summary = {
        'sample': total,
        'ok': len(ok),
        'failed': [r for r in results if r['status'] != 'ok'],
        'coverage': {
            'effect': round(100 * len(with_effects) / len(ok), 1) if ok else 0,
            'taste': round(100 * len(with_taste) / len(ok), 1) if ok else 0,
            'medicalUsage': round(100 * len(with_med) / len(ok), 1) if ok else 0,
            'sideEffects': round(100 * len(with_side) / len(ok), 1) if ok else 0,
            'terpenes': round(100 * len(with_terp) / len(ok), 1) if ok else 0,
        },
        'avg_attrs_per_product': round(avg_attrs, 1),
        'avg_terpenes_per_product': round(avg_terp, 1),
        'avg_html_bytes': int(avg_bytes),
        'seconds_per_page': round((time.time() - t0) / total, 2),
        'duration_s': round(time.time() - t0, 1),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    with open('/root/flowzz-phase0-attrs.json', 'w') as f:
        json.dump({'summary': summary, 'results': results}, f, ensure_ascii=False, indent=1)
    print('gespeichert: /root/flowzz-phase0-attrs.json')


if __name__ == '__main__':
    main()
