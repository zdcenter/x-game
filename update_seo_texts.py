import json
import os

def update_zh():
    path = 'frontend/src/assets/i18n/zh.json'
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    data["seo.watersort.desc"] = "在线免费游玩水管分色（Water Sort）谜题！将不同颜色的液体倒入试管，直到每个试管里只有一种颜色。这是一款令人放松又极其烧脑的逻辑分类益智解谜游戏，锻炼你的逻辑思维，支持单机闯关与多人竞速对战体验！"
    data["seo.classic2048.desc"] = "在线玩经典的 4x4 2048 游戏！上下左右滑动屏幕，合并相同的数字方块，直到拼出 2048。支持单机挑战与多人联机对战，挑战你的脑力极限！在数字合并中感受逻辑与策略的完美结合。"
    data["seo.connect.desc"] = "在线畅玩经典一笔画颜色连线益智游戏 (Connect)。在网格中，将相同颜色的端点用不交叉的线条完美连接起来，并填满所有空白格子。通过极简的设计锻炼你的逻辑与空间规划能力，支持多人对战竞技！"
    data["seo.connect.title"] = "一笔画连线 (Connect) - 经典水管工颜色连线逻辑益智闯关游戏，支持多人对战"
    data["seo.tetris.desc"] = "重温经典的俄罗斯方块消除游戏，或在实时多人对战模式中与好友进行垃圾行互相攻击！免费在线游玩，享受下落方块带来的无限乐趣，提升反应速度与空间逻辑能力。"
    data["seo.tetris.title"] = "俄罗斯方块对战 (Tetris) - 免费在线多人实时竞技与经典下落消除游戏"
    data["seo.leaderboard.desc"] = "查看 Puzzle PK 的全球玩家排行榜。发现各个益智游戏分类下的顶尖高手与游戏大师，比拼段位评分并向最高名次发起冲击！追踪你最喜爱的玩家，挑战最高段位，展现你的真正实力。"
    data["seo.leaderboard.title"] = "全球玩家积分排行榜 - 发现顶级益智游戏大师的段位与战绩评分 (Puzzle PK)"
    data["seo.hexa.desc"] = "在 Puzzle PK 免费在线游玩六边形消除 (Hexa Puzzle) 益智游戏。拖拽不同形状的六边形方块，填满三个方向的直线即可轻松消除得分！支持让你沉浸其中的单机无限挑战模式，以及紧张刺激的多人实时联机对战！"
    data["seo.hexa.title"] = "六边形消除 (Hexa Puzzle) - 免费在线休闲益智单机与联机竞技对战游戏"
    data["seo.nonogram.desc"] = "免费在线畅玩经典的纯逻辑数织 (Nonogram/Picross) 解谜游戏。根据数字提示进行逻辑推理与填色，解开隐藏的精美像素画。支持单机挑战和多人在线竞速对战，享受沉浸式的像素涂色乐趣！"
    
    data["seo.lobby.desc"] = "欢迎来到 Puzzle PK (益智擂台) 官方游戏大厅！这里汇集了多款高品质的免费在线逻辑益智游戏。无论您是想通过极致的单机挑战来培养专注力与逻辑思维，还是渴望参与刺激的实时多人联网竞速与 PK 对战，我们都能为您提供极简且无广告干扰的最佳体验。无需下载安装，即刻加入我们的游戏大厅，开启一场属于您的脑力激荡之旅，与全球玩家同台竞技！"
    data["seo.default.desc"] = "Puzzle PK (益智擂台) 是一个现代化的免费网页游戏平台，提供数十款高品质的在线益智逻辑与脑力游戏，支持单机脑力训练与多人实时联网对抗，无需下载即点即玩。"

    data["seo.docs.sliding.desc"] = "在线挑战 15 字数字华容道（Sliding Puzzle）！提供详细的互动式进阶图文教程，教你通过降维打击一步步还原华容道。深入锻炼你的空间逻辑、规划能力和手眼协调速度。"
    data["seo.docs.nonogram.desc"] = "数织 (Nonogram) 游戏详细图文教程与高阶解题技巧。学习如何通过交叉对比、边缘推理等逻辑方法，快速解开复杂的像素画涂色谜题。"
    data["seo.docs.sliding.title"] = "数字华容道 (Sliding Puzzle) 玩法规则与进阶通关教程"
    data["seo.docs.nonogram.title"] = "数织 (Nonogram/Picross) 逻辑解谜基础教程与高级技巧"

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def update_en():
    path = 'frontend/src/assets/i18n/en.json'
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    data["seo.docs.drop2048.desc"] = "Learn the complete rules, mechanics, and strategies for Drop 2048. Master physics-based puzzle techniques to safely merge blocks and achieve a massive high score without overflowing the board."
    data["seo.docs.drop2048.title"] = "How to Play Drop 2048 - Rules, Mechanics, and Strategies"

    data["seo.docs.hexa.desc"] = "Master the Hexa Puzzle with our comprehensive guide! Learn fundamental placement rules, advanced line-clearing combinations, and strategies to survive endless mode or beat opponents in multiplayer."
    data["seo.docs.hexa.title"] = "Hexa Puzzle Strategy Guide - How to Play and Win"

    data["seo.docs.sokoban.desc"] = "The ultimate guide to playing Sokoban box-pushing puzzles. Learn critical strategies to avoid permanent deadlocks, plan complex box deliveries, and master advanced spatial reasoning skills."
    data["seo.docs.sokoban.title"] = "How to Play Sokoban - Puzzle Strategies and Deadlock Prevention"
    
    data["seo.docs.block.desc"] = "Discover effective strategies and rules for the classic 1010 Block Puzzle. Learn how to manage board space, set up massive combo clears, and survive longer in endless gameplay modes."
    data["seo.docs.block.title"] = "Block Puzzle Guide - Strategies, Rules, and Board Management"
    
    data["seo.docs.sliding.desc"] = "Master the 15 Sliding Puzzle with our interactive step-by-step tutorial. Learn the reliable layer-by-layer solving method to conquer any sliding block configuration quickly and efficiently."
    data["seo.docs.sliding.title"] = "How to Solve the 15 Sliding Puzzle - Step-by-Step Tutorial"
    
    data["seo.docs.connect.desc"] = "Comprehensive guide and tutorials for the Connect pipe puzzle game. Learn pattern recognition techniques to pair colors perfectly while covering the entire grid without crossing lines."
    data["seo.docs.connect.title"] = "Connect Logic Puzzle Guide - How to Link Colors and Win"
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def update_blog():
    path = 'frontend/public/assets/blog/sokoban-strategy.json'
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # The user wanted a longer description for /en/blog/sokoban-strategy
        if "en" in data:
            data["en"]["description"] = "Learn the fundamental strategies and advanced techniques to conquer any Sokoban puzzle without getting stuck — including critical deadlock patterns, reverse thinking, influence analysis, and step-by-step box delivery planning for the most difficult logic challenges."
            
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

update_zh()
update_en()
update_blog()
print("All SEO data updated successfully!")
