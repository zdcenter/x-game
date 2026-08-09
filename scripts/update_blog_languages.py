import json
import os
import copy

def update_backend_blog():
    path = 'backend/pkg/db/blog_seeds.json'
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        langs_to_add = ['es', 'ja', 'ko', 'pt', 'fr', 'de']
        
        for post in data:
            if 'en' in post:
                en_data = post['en']
                for lang in langs_to_add:
                    if lang not in post:
                        # Copy English data as a placeholder for now
                        post[lang] = copy.deepcopy(en_data)
                        post[lang]['title'] = f"[{lang}] {en_data.get('title', '')}"
                        post[lang]['description'] = f"[{lang}] {en_data.get('description', '')}"
                        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
    # Also update the frontend static JSON files
    frontend_blog_dir = 'frontend/public/assets/blog'
    if os.path.exists(frontend_blog_dir):
        for filename in os.listdir(frontend_blog_dir):
            if filename.endswith('.json') and filename != 'index.json':
                filepath = os.path.join(frontend_blog_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    post_data = json.load(f)
                
                changed = False
                if 'en' in post_data:
                    en_data = post_data['en']
                    for lang in langs_to_add:
                        if lang not in post_data:
                            post_data[lang] = copy.deepcopy(en_data)
                            post_data[lang]['title'] = f"[{lang}] {en_data.get('title', '')}"
                            post_data[lang]['description'] = f"[{lang}] {en_data.get('description', '')}"
                            changed = True
                
                if changed:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        json.dump(post_data, f, ensure_ascii=False, indent=2)

update_backend_blog()
print("Blog seeds and static files updated successfully!")
