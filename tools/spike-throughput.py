#!/usr/bin/env python3
"""Phase 0 – Durchsatz-Test: wie schnell dürfen wir crawlen, ohne 429 zu kassieren?"""
import json, re, time, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/131.0 Safari/537.36'}
BASE = 'https://flowzz.com'


def fetch(slug):
    t0 = time.time()
    try:
        req = urllib.request.Request(f'{BASE}/product/{slug}', headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read()
            return {'slug': slug, 'code': r.status, 'ms': int((time.time() - t0) * 1000), 'bytes': len(body)}
    except urllib.error.HTTPError as e:
        return {'slug': slug, 'code': e.code, 'ms': int((time.time() - t0) * 1000), 'bytes': 0}
    except Exception as e:
        return {'slug': slug, 'code': 'ERR', 'ms': int((time.time() - t0) * 1000), 'bytes': 0, 'err': str(e)}


def slugs(n):
    req = urllib.request.Request(f'{BASE}/api/v1/views/flowers?pagination%5BpageSize%5D=200', headers=UA)
    d = json.loads(urllib.request.urlopen(req).read())['data']['data']
    return [p['url'] for p in d[:n]]


def run(label, all_slugs, workers, delay):
    t0 = time.time()
    out = []

    def task(s):
        r = fetch(s)
        if delay:
            time.sleep(delay)
        return r

    with ThreadPoolExecutor(max_workers=workers) as ex:
        for r in ex.map(task, all_slugs):
            out.append(r)

    el = time.time() - t0
    codes = {}
    for r in out:
        codes[str(r['code'])] = codes.get(str(r['code']), 0) + 1
    ok = sum(1 for r in out if r['code'] == 200)
    res = {
        'label': label, 'workers': workers, 'delay': delay, 'pages': len(out),
        'ok': ok, 'codes': codes,
        'seconds': round(el, 1),
        'pages_per_sec': round(len(out) / el, 2),
        'avg_ms': int(sum(r['ms'] for r in out) / len(out)),
        'eta_all_2717_min': round(2717 / (len(out) / el) / 60, 1),
    }
    print(json.dumps(res, ensure_ascii=False))
    return res


def main():
    pool = slugs(200)
    results = []
    # aufwärmen
    fetch(pool[0]); time.sleep(2)

    plans = [
        ('sequenziell 0.7s', 1, 0.7, pool[0:40]),
        ('4 parallel, 0.2s', 4, 0.2, pool[40:100]),
        ('8 parallel, 0.1s', 8, 0.1, pool[100:160]),
        ('12 parallel, 0s', 12, 0, pool[160:200]),
    ]
    for label, workers, delay, batch in plans:
        results.append(run(label, batch, workers, delay))
        time.sleep(10)

    print(json.dumps({'results': results}, ensure_ascii=False, indent=1))
    with open('/root/flowzz-phase0-throughput.json', 'w') as f:
        json.dump(results, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
