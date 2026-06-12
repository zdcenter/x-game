import os
import re

games_dir = '/home/zd/x-game/frontend/src/app/features/games'
pattern = re.compile(r'(headerBgClass="[^"]*?")')
rounded_pattern = re.compile(r'\b(?:lg:)?rounded-(?:t-[^\s"|]+|none)\b')

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content
    for match in pattern.finditer(content):
        old_attr = match.group(1)
        # remove rounded classes
        new_attr = rounded_pattern.sub('', old_attr)
        # remove extra spaces
        new_attr = re.sub(r'\s+', ' ', new_attr).replace(' "', '"').replace('=" ', '="')
        new_content = new_content.replace(old_attr, new_attr)

    if new_content != content:
        print(f"Updated {filepath}")
        with open(filepath, 'w') as f:
            f.write(new_content)

for root, _, files in os.walk(games_dir):
    for file in files:
        if file.endswith('.html') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

