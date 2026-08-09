import json
import os

def update_backend_blog():
    path = 'backend/pkg/db/blog_seeds.json'
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for post in data:
            if post.get("slug") == "sokoban-strategy":
                if "en" in post:
                    post["en"]["description"] = "Learn the fundamental strategies and advanced techniques to conquer any Sokoban puzzle without getting stuck — including critical deadlock patterns, reverse thinking, influence analysis, and step-by-step box delivery planning for the most difficult logic challenges."
                    
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

update_backend_blog()
print("Backend blog updated successfully!")
