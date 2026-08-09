import json
with open('backend/pkg/db/blog_seeds.json', 'r') as f:
    data = json.load(f)
for i, post in enumerate(data):
    langs = [k for k in post.keys() if len(k) == 2]
    print(f"Post {i} ({post.get('id')}): {langs}")
