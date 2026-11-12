#!/usr/bin/env python3
"""API-Durchsatz messen: /api/v1/views/<cat>/<slug> mit 1/2/4/8 req/s."""
import json, sys, time, urllib.error, urllib.request

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/131.0 Safari/537.36'}
BASE = 'https://flowzz.com'


def slugs(n=400):
    out = []
    for page in (1, 2):
        req = urllib.request.Request(
            f'{BASE}/api/v1/views/flowers?pagination%5BpageSize%5D=200&pagination%5Bpage%5D={page}', headers=UA)
        out += [p['url'] for p in json.loads(urllib.request.urlopen(req).read())['data']['data']]
    return out[:n]


def run(pool, rps, n):
    interval = 1.0 / rps
    codes, t0 = {}, time.time()
    for s in pool[:n]:
        t = time.time()
        try:
            req = urllib.request.Request(f'{BASE}/api/v1/views/flowers/{s}', headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                body = r.read()
                codes[r.status] = codes.get(r.status, 0) + 1
                ok = r.status == 200 and b'strain_attributes' in body
                if not ok:
                    codes['no_attrs'] = codes.get('no_attrs', 0) + 1
        except urllib.error.HTTPError as e:
            codes[e.code] = codes.get(e.code, 0) + 1
            if e.code == 429:
                break
        except Exception:
            codes['ERR'] = codes.get('ERR', 0) + 1
        dt = time.time() - t
        if dt < interval:
            time.sleep(interval - dt)
    el = time.time() - t0
    res = {'rps_target': rps, 'requests': sum(v for k, v in codes.items() if isinstance(k, int)),
           'codes': codes, 'seconds': round(el, 1),
           'eta_all_2889_min': round(2889 / max(0.1, (sum(v for k, v in codes.items() if isinstance(k, int)) / el)) / 60, 1)}
    print(json.dumps(res, ensure_ascii=False))
    return res


if __name__ == '__main__':
    pool = slugs(400)
    print(f'{len(pool)} Produkte im Pool')
    for rps in (1, 2, 4, 8):
        print(f'--- {rps} req/s')
        run(pool, rps, 40)
        time.sleep(8)
