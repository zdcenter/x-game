import json

index_path = "/home/zd/x-game/frontend/public/assets/blog/index.json"
with open(index_path, "r", encoding="utf-8") as f:
    blogs = json.load(f)

blog_id = "nonogram-strategy"
exists = any(b['id'] == blog_id for b in blogs)

if not exists:
    new_entry = {
      "id": blog_id,
      "date": "2026-07-19",
      "en": {
        "title": "Nonogram Strategy: Step-by-Step Guide to Solving Puzzles",
        "description": "A detailed step-by-step tutorial on how to solve Nonogram (Picross) puzzles using logic and constraints, from basic overlaps to advanced techniques.",
        "keywords": "nonogram, picross, strategy, tutorial, logic puzzle, guide",
        "readTime": "12 min read",
        "author": "Puzzle PK Team",
        "tags": ["Nonogram", "Strategy", "Tutorial"]
      },
      "zh": {
        "title": "数织 (Nonogram) 详细攻略：一步一步教你解题",
        "description": "这是一篇从入门到进阶的数织（Nonogram/Picross）详细解题攻略，通过图文并茂的实例，一步步教你如何运用逻辑和技巧完成解谜。",
        "keywords": "数织, nonogram, picross, 攻略, 解题思路, 逻辑解谜",
        "readTime": "12 分钟阅读",
        "author": "Puzzle PK Team",
        "tags": ["数织", "攻略", "解密"]
      }
    }
    blogs.insert(0, new_entry)
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(blogs, f, ensure_ascii=False, indent=2)
    print("Updated public index.json")
else:
    print("Blog already in index.json")
