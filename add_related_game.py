import json
import os

blog_id = "nonogram-strategy"
game_id = "nonogram"
public_dir = "/home/zd/x-game/frontend/public/assets/blog"

# Update index.json
index_path = os.path.join(public_dir, "index.json")
with open(index_path, "r", encoding="utf-8") as f:
    blogs = json.load(f)

for b in blogs:
    if b["id"] == blog_id:
        b["relatedGameId"] = game_id

with open(index_path, "w", encoding="utf-8") as f:
    json.dump(blogs, f, ensure_ascii=False, indent=2)

# Update nonogram-strategy.json
post_path = os.path.join(public_dir, f"{blog_id}.json")
with open(post_path, "r", encoding="utf-8") as f:
    post = json.load(f)

post["relatedGameId"] = game_id

with open(post_path, "w", encoding="utf-8") as f:
    json.dump(post, f, ensure_ascii=False, indent=2)

print("Added relatedGameId successfully.")
