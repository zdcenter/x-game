import json
import os

translations = {
    "zh": {
        "seo.pk_arena.title": "多人排位竞技场 - Puzzle PK",
        "seo.pk_arena.desc": "进入 Puzzle PK 益智擂台的多人排位竞技场，与全球玩家实时匹配对决，在刺激的益智游戏中比拼脑力、争夺高分段位，体验竞技的乐趣！",
        "seo.pk_arena.keywords": "排位赛, 竞技场, 对决, 益智对战, PK, 多人匹配"
    },
    "en": {
        "seo.pk_arena.title": "Multiplayer Ranked PK Arena - Puzzle PK",
        "seo.pk_arena.desc": "Enter the Multiplayer Ranked PK Arena on Puzzle PK. Match with players worldwide in real-time logic and puzzle games, climb the ranks, and prove your brain power!",
        "seo.pk_arena.keywords": "ranked match, arena, pk, puzzle battles, multiplayer, brain power"
    },
    "es": {
        "seo.pk_arena.title": "Arena Clasificatoria Multijugador - Puzzle PK",
        "seo.pk_arena.desc": "Entra en la Arena Clasificatoria Multijugador de Puzzle PK. Empareja con jugadores de todo el mundo en tiempo real en juegos de lógica y rompecabezas. ¡Demuestra tu poder mental!",
        "seo.pk_arena.keywords": "partida clasificatoria, arena, batallas de rompecabezas, multijugador"
    },
    "ja": {
        "seo.pk_arena.title": "マルチプレイヤーランクアリーナ - Puzzle PK",
        "seo.pk_arena.desc": "Puzzle PKのマルチプレイヤーランクアリーナに参加しましょう。世界中のプレイヤーとリアルタイムでパズルゲームで対戦し、ランクを上げて脳の力を証明しましょう！",
        "seo.pk_arena.keywords": "ランクマッチ, アリーナ, パズルバトル, マルチプレイヤー"
    },
    "ko": {
        "seo.pk_arena.title": "멀티플레이어 랭크 아레나 - Puzzle PK",
        "seo.pk_arena.desc": "Puzzle PK의 멀티플레이어 랭크 아레나에 입장하세요. 전 세계 플레이어들과 실시간 퍼즐 게임으로 매칭하고, 순위를 올리며 두뇌의 힘을 증명하세요!",
        "seo.pk_arena.keywords": "랭크 매치, 아레나, 퍼즐 배틀, 멀티플레이어"
    },
    "pt": {
        "seo.pk_arena.title": "Arena Ranqueada Multijogador - Puzzle PK",
        "seo.pk_arena.desc": "Entre na Arena Ranqueada Multijogador do Puzzle PK. Jogue com pessoas do mundo todo em jogos de lógica em tempo real. Suba de rank e prove seu poder mental!",
        "seo.pk_arena.keywords": "partida ranqueada, arena, batalhas de quebra-cabeça, multijogador"
    },
    "fr": {
        "seo.pk_arena.title": "Arène Classée Multijoueur - Puzzle PK",
        "seo.pk_arena.desc": "Entrez dans l'arène classée multijoueur sur Puzzle PK. Jouez contre le monde entier en temps réel dans des jeux de logique et prouvez votre intelligence !",
        "seo.pk_arena.keywords": "match classé, arène, batailles de puzzle, multijoueur"
    },
    "de": {
        "seo.pk_arena.title": "Multiplayer-Ranglisten-Arena - Puzzle PK",
        "seo.pk_arena.desc": "Betreten Sie die Multiplayer-Ranglisten-Arena von Puzzle PK. Treten Sie in Echtzeit-Logikspielen gegen weltweite Spieler an und beweisen Sie Ihre Gehirnleistung!",
        "seo.pk_arena.keywords": "ranglistenspiel, arena, puzzle-schlachten, mehrspieler"
    }
}

i18n_dir = 'frontend/src/assets/i18n'
for lang, new_keys in translations.items():
    filepath = os.path.join(i18n_dir, f'{lang}.json')
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for k, v in new_keys.items():
            data[k] = v
            
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated i18n files for pk_arena!")
