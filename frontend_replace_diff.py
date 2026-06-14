import os
import re

replacements = {
    r"'beginner'": "'easy'",
    r"'intermediate'": "'medium'",
    r"'advanced'": "'hard'",
    r"'hard_mode'": "'hard_1'",
    r"'professional'": "'hard_2'",
    r'"beginner"': '"easy"',
    r'"intermediate"': '"medium"',
    r'"advanced"': '"hard"',
    r'"hard_mode"': '"hard_1"',
    r'"professional"': '"hard_2"',
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
