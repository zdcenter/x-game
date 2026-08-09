import json

def check_lengths(lang, filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"\n--- Checking SEO for {lang} ---")
    
    issues = []
    
    # Check all seo keys
    for k, v in data.items():
        if k.startswith('seo.') and k.endswith('.title'):
            if len(v) < 15:
                issues.append(f"Title too short ({len(v)}): {k} -> {v}")
        if k.startswith('seo.') and k.endswith('.desc'):
            if len(v) < 25:
                issues.append(f"Desc too short ({len(v)}): {k} -> {v}")

    # Check identical desc
    descs = {}
    for k, v in data.items():
        if k.startswith('seo.') and k.endswith('.desc'):
            if v in descs:
                descs[v].append(k)
            else:
                descs[v] = [k]
    
    for v, keys in descs.items():
        if len(keys) > 1:
            issues.append(f"Identical desc ({len(keys)} occurrences): {keys} -> {v[:50]}...")
            
    if not issues:
        print("No issues found.")
    else:
        for iss in issues:
            print(iss)

check_lengths('zh', 'frontend/src/assets/i18n/zh.json')
check_lengths('en', 'frontend/src/assets/i18n/en.json')
