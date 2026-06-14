import os
import re

replacements = {
    r"'same_pk_speed'": "'speed'",
    r"'same_pk_steal'": "'steal'",
    r"'same_pk_score'": "'score'",
    r"'diff_pk_score'": "'score'",
    r"'diff_pk_attack'": "'battle'",
    r"'same_pk_classic'": "'battle'"
}

for root, dirs, files in os.walk('frontend/src/app/features/games'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.html'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements.items():
                new_content = re.sub(old, new, new_content)
                
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

interfaces_file = 'frontend/src/app/core/interfaces/game-store.interface.ts'
with open(interfaces_file, 'r') as f:
    content = f.read()
new_content = content
for old, new in replacements.items():
    new_content = re.sub(old, new, new_content)
if new_content != content:
    with open(interfaces_file, 'w') as f:
        f.write(new_content)
    print(f"Updated {interfaces_file}")
