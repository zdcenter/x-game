import os

file_path = "src/app/features/games/sokoban/components/board/sokoban-board.component.ts"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# The lines to delete are 176 to 256 (inclusive, 1-indexed)
# So array indices 175 to 255
del lines[175:256]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(lines)
print("Removed duplicated lines 176-256")
