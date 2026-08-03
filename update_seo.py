import json

def update_json(filename, is_zh):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    updates = {}
    if is_zh:
        updates = {
            "seo.login.title": "登录账号 - 加入 Puzzle PK (益智擂台) 参与全球玩家脑力对战",
            "seo.register.title": "注册账号 - 免费创建 Puzzle PK (益智擂台) 账号畅玩所有益智游戏",
            "seo.admin.title": "管理控制台 - Puzzle PK 益智擂台平台后台数据与用户管理系统",
            "seo.profile.title": "个人主页 - 查看并管理您的 Puzzle PK 游戏战绩、段位评分与好友列表",
            "seo.codebreaker.title": "1A2B 密码破译 (Codebreaker) - 免费在线休闲逻辑猜数字单机与联机游戏",
            "seo.math24.title": "24点游戏 (Math 24) - 经典儿童数学心算能力提升与在线对战脑力游戏",
            "seo.hashi.title": "桥梁谜题 (Hashi) - 经典逻辑连线解谜，支持在线单机闯关与多人竞速对战",
            "seo.gomoku.title": "五子棋对战 (Gomoku) - 免费在线双人实时匹配竞技，黑白棋子策略博弈",
            "seo.drop2048.title": "下落 2048 (Drop 2048) - 物理掉落融合创意数字合成在线休闲拼图游戏",
            "seo.classic2048.title": "经典 2048 (Classic 2048) - 免费在线滑动合并数字，挑战脑力极限的高分拼图",
            "seo.watersort.title": "水管分色 (Water Sort) - 令人放松的经典液体颜色分类与逻辑推理烧脑游戏",
            "seo.lightsout.title": "点灯 (Lights Out) - 经典电子逻辑推理烧脑解谜，支持单机闯关与多人竞速",
            "seo.blog.title": "官方博客 - Puzzle PK 益智游戏开发日志、脑力训练攻略与最新功能发布",
            "seo.docs.title": "游戏教程与规则指南 - 了解如何在 Puzzle PK 中游玩各类经典逻辑益智游戏",
            "seo.legal.title": "隐私政策与服务条款 - Puzzle PK (益智擂台) 用户协议与数据隐私保护说明",
            "seo.daily.title": "每日挑战 (Daily Challenge) - 每天刷新高难度脑力谜题，赢取额外经验奖励",
            "seo.idiom.title": "成语填字益智游戏 (Idiom) - 结合 Wordle 玩法的中文成语拼写闯关与每日猜词",
            "seo.nonogram.title": "数织逻辑解谜 (Nonogram/Picross) - 免费在线像素画涂色解谜，支持联机竞速",
            
            "seo.default.desc": "Puzzle PK (益智擂台) 是一个现代化的免费网页游戏平台，提供扫雷、数独、2048等十几款高品质的在线益智逻辑游戏，支持单机脑力训练与多人实时联网对战。",
            "seo.login.desc": "登录您的 Puzzle PK (益智擂台) 账号，安全进入游戏竞技场，与好友互动，参与排位赛并永久保存您的全球分数记录和游戏进度。",
            "seo.register.desc": "立即创建您的免费 Puzzle PK (益智擂台) 账号，无需下载安装即可开始畅玩各种经典多人对战与单机逻辑益智游戏。",
            "seo.admin.desc": "Puzzle PK (益智擂台) 平台的安全后台管理控制台，用于系统管理员管理用户数据、监控游戏房间状态以及配置全站参数。",
            "seo.profile.desc": "访问您的个人主页，查看并管理您的 Puzzle PK 账号设置、好友列表、详细游戏数据统计、成就徽章以及排位赛积分历史记录。",
            "seo.leaderboard.desc": "查看 Puzzle PK 的全球玩家排行榜。发现各个益智游戏分类下的顶尖高手与游戏大师，比拼段位评分并向最高名次发起冲击！",
            "seo.daily.desc": "参与 Puzzle PK 的每日挑战！每天尝试解答精心挑选的高难度特色脑力谜题，完成挑战即可获得丰厚的额外经验奖励与成就徽章。"
        }
    else:
        updates = {
            "seo.login.title": "Login to Your Account - Join Puzzle PK Brain Games Arena",
            "seo.register.title": "Create a Free Account - Play All Multiplayer Puzzle Games on Puzzle PK",
            "seo.admin.title": "Administration Console - Puzzle PK Platform Management System",
            "seo.profile.title": "Player Profile - Manage Your Puzzle PK Stats, Rankings, and Friends List",
            "seo.codebreaker.title": "Play 1A2B Codebreaker Online - Free Mastermind Logic & Number Guessing Game",
            "seo.daily.title": "Daily Puzzle Challenge - Test Your Brain & Earn Bonus XP on Puzzle PK",
            "seo.nonogram.title": "Play Nonogram (Picross) Online - Free Logic Pixel Art Coloring Puzzle Game",
            
            "seo.admin.desc": "Secure administration console for Puzzle PK platform management. Authorized personnel can manage user accounts, monitor active game rooms, and configure system settings.",
            "seo.leaderboard.desc": "View the global player leaderboard on Puzzle PK. Discover top-ranked players, compare your Elo ratings across various puzzle games, and climb to the master tier!",
            "seo.daily.desc": "Take on the Puzzle PK daily challenge! Test your logical thinking with our carefully selected brain puzzles every day and complete them to earn exclusive bonus XP."
        }
        
    for k, v in updates.items():
        if k in data:
            data[k] = v
            
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

update_json('frontend/src/assets/i18n/zh.json', True)
update_json('frontend/src/assets/i18n/en.json', False)
