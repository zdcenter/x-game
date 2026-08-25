#!/usr/bin/env python3
"""merge_blog_translations.py — Merge subagent-produced blog translations
(content/blog_translations/{slug}.json) into the blog JSON files under
frontend/public/assets/blog/{slug}.json.

Translation file format (content is a plain string with real newlines):
{"es": {"title": "...", "description": "...", "keywords": "...",
        "readTime": "...", "author": "...", "content": "..."},
 "ja": {...}, "ko": {...}, "pt": {...}, "fr": {...}, "de": {...}}
"""
import json
import glob
import os

SRC_DIR = 'content/blog_translations'
DST_DIR = 'frontend/public/assets/blog'
LANGS = ['es', 'ja', 'ko', 'pt', 'fr', 'de']

files = sorted(glob.glob(os.path.join(SRC_DIR, '*.json')))
if not files:
    print('No translation files found yet.')
    raise SystemExit(1)

for fn in files:
    slug = os.path.basename(fn).replace('.json', '')
    dst = os.path.join(DST_DIR, f'{slug}.json')
    if not os.path.exists(dst):
        print(f'  !! no target blog file for {slug}, skipping')
        continue
    tr = json.load(open(fn, encoding='utf-8'))
    blog = json.load(open(dst, encoding='utf-8'))
    present = [l for l in LANGS if l in tr]
    if not present:
        print(f'  !! {slug}: no translatable languages present, skipping')
        continue
    for lang in present:
        t = tr[lang]
        for field in ('title', 'description', 'keywords', 'readTime', 'author', 'content'):
            if field not in t or not str(t[field]).strip():
                print(f'  !! {slug}: {lang}.{field} empty, skipping')
                raise SystemExit(1)
        blog[lang] = {**blog.get(lang, {}), **{k: t[k] for k in ('title', 'description', 'keywords', 'readTime', 'author', 'content')}}
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(blog, f, ensure_ascii=False, indent=2)
        f.write('\n')
    json.load(open(dst, encoding='utf-8'))
    print(f'{slug}.json merged — {len(present)} languages ({", ".join(present)})')

print('All blog translations merged and validated.')
