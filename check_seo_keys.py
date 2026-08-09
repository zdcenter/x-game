import json

def check_keys(lang):
    with open(f'frontend/src/assets/i18n/{lang}.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    keys_to_check = [
        "seo.watersort.desc", "seo.classic2048.desc", "seo.connect.desc", "seo.connect.title",
        "seo.tetris.desc", "seo.tetris.title", "seo.leaderboard.desc", "seo.leaderboard.title",
        "seo.hexa.desc", "seo.hexa.title", "seo.nonogram.desc",
        "seo.docs.drop2048.desc", "seo.docs.sliding.desc", "seo.docs.nonogram.desc",
        "seo.blog.sokoban-strategy.desc", "seo.docs.hexa.desc", "seo.docs.sokoban.desc",
        "seo.default.desc", "seo.lobby.desc", "seo.docs.block.desc", "seo.docs.connect.desc"
    ]
    
    print(f"--- {lang} ---")
    for k in keys_to_check:
        print(f"{k}: {data.get(k, 'NOT FOUND')}")

check_keys('zh')
check_keys('en')
