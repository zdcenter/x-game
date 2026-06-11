import os

file_path = "/home/zd/x-game/frontend/src/app/features/games/sokoban/components/sokoban-lobby/sokoban-lobby.component.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('i18n-title="@@lobby.sokoban" title="Sokoban"', '[title]="i18n.t(\'lobby.sokoban\')()"')
content = content.replace('i18n-subtitle="@@lobby.select_level" subtitle="Select Level"', '[subtitle]="i18n.t(\'lobby.select_level\')()"')
content = content.replace('<ng-container i18n="@@game.total_levels">Total Levels</ng-container>', '{{ i18n.t(\'game.total_levels\')() }}')
content = content.replace('<ng-container i18n="@@game.level">Level</ng-container>', '{{ i18n.t(\'game.level\')() }}')
content = content.replace('i18n="@@game.in_progress">In Progress</span>', '>{{ i18n.t(\'game.in_progress\')() }}</span>')
content = content.replace('i18n="@@game.finished">Finished</span>', '>{{ i18n.t(\'game.finished\')() }}</span>')
content = content.replace('i18n="@@game.unplayed">Unplayed</span>', '>{{ i18n.t(\'game.unplayed\')() }}</span>')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("File modified.")
