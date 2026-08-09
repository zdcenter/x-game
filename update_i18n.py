import json
import os

translations = {
    "zh": {
        "game.lobby_chat": "大厅交流",
        "game.send_hero_post": "发英雄帖",
        "game.send_quick_phrase": "发送快捷约战喊话",
        "game.quick_phrase_1": "有人来切磋一下吗？",
        "game.quick_phrase_2": "我建好房间了，速度进！",
        "game.quick_phrase_3": "等一个高手。",
        "game.quick_phrase_4": "菜鸟互啄，欢乐多！",
        "game.quick_phrase_5": "谁敢来挑战我？"
    },
    "en": {
        "game.lobby_chat": "Lobby Chat",
        "game.send_hero_post": "Send Hero Post",
        "game.send_quick_phrase": "Send Quick Challenge",
        "game.quick_phrase_1": "Anyone want to spar?",
        "game.quick_phrase_2": "I've created a room, join quickly!",
        "game.quick_phrase_3": "Waiting for a pro.",
        "game.quick_phrase_4": "Noobs pecking each other, much fun!",
        "game.quick_phrase_5": "Who dares to challenge me?"
    },
    "es": {
        "game.lobby_chat": "Chat del Lobby",
        "game.send_hero_post": "Enviar Publicación",
        "game.send_quick_phrase": "Enviar Desafío",
        "game.quick_phrase_1": "¿Alguien quiere jugar?",
        "game.quick_phrase_2": "¡He creado una sala, únete!",
        "game.quick_phrase_3": "Esperando a un profesional.",
        "game.quick_phrase_4": "¡Mucha diversión!",
        "game.quick_phrase_5": "¿Quién se atreve a desafiarme?"
    },
    "ja": {
        "game.lobby_chat": "ロビーチャット",
        "game.send_hero_post": "ヒーロー投稿",
        "game.send_quick_phrase": "クイックチャレンジ",
        "game.quick_phrase_1": "誰か遊びませんか？",
        "game.quick_phrase_2": "部屋を作りました、参加して！",
        "game.quick_phrase_3": "プロを待っています。",
        "game.quick_phrase_4": "初心者同士、楽しい！",
        "game.quick_phrase_5": "誰が挑戦する？"
    },
    "ko": {
        "game.lobby_chat": "로비 채팅",
        "game.send_hero_post": "게시물 보내기",
        "game.send_quick_phrase": "빠른 도전 보내기",
        "game.quick_phrase_1": "스파링 할 사람?",
        "game.quick_phrase_2": "방을 만들었습니다, 들어오세요!",
        "game.quick_phrase_3": "프로를 기다리는 중.",
        "game.quick_phrase_4": "초보자들, 너무 재밌어!",
        "game.quick_phrase_5": "누가 도전하겠는가?"
    },
    "pt": {
        "game.lobby_chat": "Bate-papo",
        "game.send_hero_post": "Enviar Post",
        "game.send_quick_phrase": "Enviar Desafio",
        "game.quick_phrase_1": "Alguém quer treinar?",
        "game.quick_phrase_2": "Criei uma sala, entre!",
        "game.quick_phrase_3": "Esperando por um pro.",
        "game.quick_phrase_4": "Noobs, muita diversão!",
        "game.quick_phrase_5": "Quem ousa me desafiar?"
    },
    "fr": {
        "game.lobby_chat": "Chat du hall",
        "game.send_hero_post": "Envoyer un post",
        "game.send_quick_phrase": "Envoyer un défi",
        "game.quick_phrase_1": "Quelqu'un veut jouer ?",
        "game.quick_phrase_2": "J'ai créé une salle !",
        "game.quick_phrase_3": "En attente d'un pro.",
        "game.quick_phrase_4": "Très amusant !",
        "game.quick_phrase_5": "Qui ose me défier ?"
    },
    "de": {
        "game.lobby_chat": "Lobby-Chat",
        "game.send_hero_post": "Heldenbeitrag senden",
        "game.send_quick_phrase": "Herausforderung senden",
        "game.quick_phrase_1": "Will jemand spielen?",
        "game.quick_phrase_2": "Raum erstellt, trete bei!",
        "game.quick_phrase_3": "Warten auf einen Profi.",
        "game.quick_phrase_4": "Viel Spaß!",
        "game.quick_phrase_5": "Wer wagt es, mich herauszufordern?"
    }
}

i18n_dir = 'frontend/src/assets/i18n'
for lang, new_keys in translations.items():
    filepath = os.path.join(i18n_dir, f'{lang}.json')
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # update data
        for k, v in new_keys.items():
            data[k] = v
            
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated i18n files!")
