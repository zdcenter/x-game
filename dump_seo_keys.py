import json

def dump_keys(lang):
    with open(f'frontend/src/assets/i18n/{lang}.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"--- {lang} ---")
    for k in data:
        if k.startswith("seo."):
            print(f"{k}: {data[k]}")

dump_keys('zh')
dump_keys('en')
