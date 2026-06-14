import os
import re

replacements = {
    r"id: 'minesweeper'": "id: GameId.Minesweeper",
    r"id: 'sudoku'": "id: GameId.Sudoku",
    r"id: 'sliding'": "id: GameId.Sliding",
    r"id: 'hexa'": "id: GameId.Hexa",
    r"id: 'tetris'": "id: GameId.Tetris",
    r"id: 'gomoku'": "id: GameId.Gomoku",
    r"id: 'codebreaker'": "id: GameId.Codebreaker",
    r"id: 'math24'": "id: GameId.Math24",
    r"id: 'drop2048'": "id: GameId.Drop2048",
    r"id: 'block'": "id: GameId.Block",
    r"id: 'lightsout'": "id: GameId.LightsOut",
    r"id: 'watersort'": "id: GameId.WaterSort",
    r"id: 'sokoban'": "id: GameId.Sokoban"
}

filepath = 'frontend/src/app/core/config/game-definitions.ts'
with open(filepath, 'r') as f:
    content = f.read()

# Add GameId to imports
if 'GameId' not in content:
    content = content.replace('GameMode, GameDifficulty', 'GameId, GameMode, GameDifficulty')

new_content = content
for old, new in replacements.items():
    new_content = re.sub(old, new, new_content)

if new_content != content:
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"Updated {filepath}")
