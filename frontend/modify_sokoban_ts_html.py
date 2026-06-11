import os

file_path = "/home/zd/x-game/frontend/src/app/features/games/sokoban/sokoban.component.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('<span class="hidden sm:inline"><ng-container i18n="@@game.levels_lobby">Lobby</ng-container></span>', '<span class="hidden sm:inline">{{ i18n.t(\'game.levels_lobby\')() }}</span>')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("File modified.")
