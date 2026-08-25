#!/usr/bin/env python3
"""check_live_urls.py — Crawl every URL in the live sitemap as Googlebot and
report non-200 responses, empty pages, and thin content.

Usage:
    python3 scripts/check_live_urls.py [sitemap_url]

Default sitemap: https://www.puzzlepk.com/sitemap.xml
Use after a deploy to verify all prerendered URLs serve real content.
"""
import re
import sys
import html
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

SITEMAP = sys.argv[1] if len(sys.argv) > 1 else 'https://www.puzzlepk.com/sitemap.xml'
UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
MIN_WORDS = 100  # visible text word count below this → flagged as thin


def fetch_loc(loc: str):
    req = urllib.request.Request(loc, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode('utf-8', errors='replace')
            status = resp.status
            final_url = resp.geturl()
    except Exception as e:
        return {'loc': loc, 'status': 'ERR', 'final': '', 'words': 0, 'title': '', 'error': str(e)[:120]}

    m = re.search(r'<title[^>]*>(.*?)</title>', body, re.S | re.I)
    title = html.unescape(m.group(1)).strip() if m else ''
    m = re.search(r'<body.*?>(.*)</body>', body, re.S | re.I)
    txt = html.unescape(re.sub(r'<script.*?</script>|<style.*?</style>|<[^>]+>', ' ',
                               m.group(1) if m else body, flags=re.S | re.I))
    words = len(re.findall(r'[A-Za-z]{2,}', txt))
    return {'loc': loc, 'status': status, 'final': final_url, 'words': words, 'title': title[:90], 'error': ''}


def main():
    req = urllib.request.Request(SITEMAP, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        xml = resp.read().decode('utf-8', errors='replace')
    locs = re.findall(r'<loc>(.*?)</loc>', xml)
    print(f'Sitemap: {len(locs)} URLs — crawling...')

    problems = []
    with ThreadPoolExecutor(max_workers=10) as pool:
        futs = {pool.submit(fetch_loc, loc): loc for loc in locs}
        done = 0
        for fut in as_completed(futs):
            done += 1
            r = fut.result()
            ok = (r['status'] == 200 and r['words'] >= MIN_WORDS and r['final'] == r['loc'])
            if not ok:
                problems.append(r)
            if done % 50 == 0 or done == len(locs):
                print(f'  {done}/{len(locs)} checked, {len(problems)} problems so far')

    print(f'\n===== RESULT: {len(locs) - len(problems)}/{len(locs)} OK, {len(problems)} problems =====')
    for p in problems:
        print(f"[{'EMPTY' if p['words'] == 0 else 'THIN' if p['words'] < MIN_WORDS else 'STATUS'}] "
              f"{p['status']} words={p['words']} {p['loc']}")
        if p.get('final') and p['final'] != p['loc']:
            print(f"    -> redirected to {p['final']}")
        if p.get('error'):
            print(f"    -> {p['error']}")
        if p['words'] == 0:
            print(f"    -> title: {p['title']!r}")
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
