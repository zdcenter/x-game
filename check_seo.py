import json

def check_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"\n--- Checking {filename} ---")
    
    titles = {}
    descs = {}
    
    for k, v in data.items():
        if k.startswith("seo.") and k.endswith(".title"):
            titles[k] = v
        if k.startswith("seo.") and k.endswith(".desc"):
            descs[k] = v
            
    print("\n[Short Titles]")
    for k, v in titles.items():
        if len(v) < 30: # Flag titles shorter than 30 chars
            print(f"{k} (len {len(v)}): {v}")
            
    print("\n[Short Descriptions]")
    for k, v in descs.items():
        if len(v) < 60: # Flag descriptions shorter than 60 chars
            print(f"{k} (len {len(v)}): {v}")
            
    print("\n[Duplicate Descriptions]")
    desc_to_keys = {}
    for k, v in descs.items():
        desc_to_keys.setdefault(v, []).append(k)
    for v, keys in desc_to_keys.items():
        if len(keys) > 1:
            print(f"DUPLICATE DESC used by {keys}:\n{v}")

check_file('frontend/src/assets/i18n/zh.json')
check_file('frontend/src/assets/i18n/en.json')
