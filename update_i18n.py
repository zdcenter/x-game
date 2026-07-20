import json
import os

files = [
    ("/home/zd/x-game/frontend/src/assets/i18n/zh.json", {
        "leaderboard.global": "全站总榜 (Global)",
        "leaderboard.global_desc": "全平台玩家总经验值排行",
        "leaderboard.level": "等级",
        "leaderboard.xp": "经验值"
    }),
    ("/home/zd/x-game/frontend/src/assets/i18n/en.json", {
        "leaderboard.global": "Global Leaderboard",
        "leaderboard.global_desc": "Top players by total XP across all games",
        "leaderboard.level": "Level",
        "leaderboard.xp": "XP"
    })
]

for filepath, new_keys in files:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    for k, v in new_keys.items():
        data[k] = v
        
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated i18n files")
