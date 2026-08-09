import json
import os

translations = {
    "zh": {
        "docs.sliding_advanced_tutorial": "进阶攻略演示：快速复原秘籍",
        "docs.sokoban_advanced_tutorial": "推箱子真实演示",
        "docs.visual_guide": "图文教程"
    },
    "en": {
        "docs.sliding_advanced_tutorial": "Advanced Tutorial: Fast Solving Strategy",
        "docs.sokoban_advanced_tutorial": "Sokoban Interactive Demo",
        "docs.visual_guide": "Visual Guide"
    },
    "es": {
        "docs.sliding_advanced_tutorial": "Tutorial Avanzado: Estrategia Rápida",
        "docs.sokoban_advanced_tutorial": "Demo Interactiva de Sokoban",
        "docs.visual_guide": "Guía Visual"
    },
    "ja": {
        "docs.sliding_advanced_tutorial": "上級チュートリアル：高速攻略法",
        "docs.sokoban_advanced_tutorial": "倉庫番のインタラクティブデモ",
        "docs.visual_guide": "ビジュアルガイド"
    },
    "ko": {
        "docs.sliding_advanced_tutorial": "고급 튜토리얼: 빠른 해결 전략",
        "docs.sokoban_advanced_tutorial": "소코반 대화형 데모",
        "docs.visual_guide": "시각적 가이드"
    },
    "pt": {
        "docs.sliding_advanced_tutorial": "Tutorial Avançado: Estratégia Rápida",
        "docs.sokoban_advanced_tutorial": "Demo Interativa de Sokoban",
        "docs.visual_guide": "Guia Visual"
    },
    "fr": {
        "docs.sliding_advanced_tutorial": "Tutoriel avancé : Stratégie rapide",
        "docs.sokoban_advanced_tutorial": "Démo interactive de Sokoban",
        "docs.visual_guide": "Guide visuel"
    },
    "de": {
        "docs.sliding_advanced_tutorial": "Erweitertes Tutorial: Schnelle Lösungsstrategie",
        "docs.sokoban_advanced_tutorial": "Interaktive Sokoban-Demo",
        "docs.visual_guide": "Visueller Leitfaden"
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
