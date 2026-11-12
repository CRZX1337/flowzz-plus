#!/usr/bin/env python3
"""Quota-Probe: Wie viele Produktseiten erlaubt flowzz, bevor 429 kommt – und wie lange dauert die Erholung?"""
import json, sys, time, urllib.error, urllib.request

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/131.0 Safari/537.36'}
BASE = 'https://flowzz.com'


def slugs(n=400):
    out = []
    for page in (1, 2):
        req = urllib.request.Request(f'{BASE}/api/v1/views/flowers?pagination%5BpageSize%5D=200&pagination%5Bpage%5D={page}', headers=UA)
        d = json.loads(urllib.request.urlopen(req).read())['data']['data']
        out += [p['url'] for p in d]
    return out[:n]


def hit(slug):
    try:
        req = urllib.request.Request(f'{BASE}/product/{slug}', headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            r.read(2048)
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 'ERR'


def main():
    pool = slugs(400)
    interval = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
    print(f'Test: 1 Request alle {interval}s, max 300')
    count = 0
    first_429 = None
    t0 = time.time()
    for s in pool[:300]:
        code = hit(s)
        count += 1
        if code == 429 and first_429 is None:
            first_429 = count
            print(f'  429 nach {count} Requests ({time.time() - t0:.0f}s)')
            break
        if count % 25 == 0:
            print(f'  {count} ok ({time.time() - t0:.0f}s)', flush=True)
        time.sleep(interval)

    if first_429 is None:
        print(f'kein 429 nach {count} Requests in {time.time() - t0:.0f}s')
        return

    # Erholung messen
    print('Erholung messen …')
    wait = 0
    for probe in range(1, 61):
        time.sleep(10)
        wait += 10
        code = hit(pool[0])
        print(f'  nach {wait}s: {code}', flush=True)
        if code == 200:
            break
    print(json.dumps({'first_429_after': first_429, 'interval': interval, 'recovery_s': wait}))


if __name__ == '__main__':
    main()
