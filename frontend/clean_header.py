import os
import re
import glob

games_dir = 'src/app/features/games'
comp = 'GameHeaderComponent'
selector = 'app-game-header'

def remove_from_imports_array(content):
    # Find the imports: [...] block
    match = re.search(r'imports:\s*\[(.*?)\]', content, re.DOTALL)
    if not match:
        return content
        
    imports_inner = match.group(1)
    new_imports = imports_inner
    
    new_imports = re.sub(r'\b' + comp + r'\b\s*,?', '', new_imports)
        
    # clean up commas
    new_imports = re.sub(r',\s*,', ',', new_imports)
    new_imports = re.sub(r',\s*$', '', new_imports.strip())
    new_imports = re.sub(r'^\s*,', '', new_imports)
    
    return content[:match.start(1)] + new_imports + content[match.end(1):]

for ts_file in glob.glob(os.path.join(games_dir, '*', '*.component.ts')):
    html_file = ts_file.replace('.ts', '.html')
    if not os.path.exists(html_file):
        continue
        
    with open(ts_file, 'r', encoding='utf-8') as f:
        ts_content = f.read()
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
        
    if selector not in html_content:
        new_ts_content = remove_from_imports_array(ts_content)
        
        # We can also remove the import statement safely since it's not a ViewChild
        new_ts_content = re.sub(r'^import\s+{.*?\b' + comp + r'\b.*?}\s+from\s+[\'"].*?[\'"];?\n?', '', new_ts_content, flags=re.MULTILINE)
        new_ts_content = re.sub(r',\s*' + comp + r'\b', '', new_ts_content)
        new_ts_content = re.sub(r'\b' + comp + r'\s*,', '', new_ts_content)
        new_ts_content = re.sub(r'^import\s*{\s*}\s*from\s+[\'"].*?[\'"];?\n?', '', new_ts_content, flags=re.MULTILINE)

        if new_ts_content != ts_content:
            with open(ts_file, 'w', encoding='utf-8') as f:
                f.write(new_ts_content)
            print(f"Removed {comp} from {ts_file}")

print("Done cleaning GameHeaderComponent")
