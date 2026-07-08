import os
import re
import glob

games_dir = 'src/app/features/games'
components_to_remove = [
    'GameLobbyPanelComponent',
    'GameRulesModalComponent',
    'TutorialOverlayComponent',
    'GamePkModeBadgeComponent'
]

def clean_imports(content):
    # This will match the imports array in @Component
    imports_match = re.search(r'imports:\s*\[(.*?)\]', content, re.DOTALL)
    if not imports_match:
        return content

    imports_content = imports_match.group(1)
    new_imports_content = imports_content

    for comp in components_to_remove:
        # Check if the component is used in the HTML file
        # We assume if the component is in imports, it might be unused
        # We can just blindly remove them and let the build tell us if we missed something,
        # but since we know these were moved to GameLayoutComponent, they shouldn't be in the individual game templates anymore (except maybe idiom, which we skipped).
        pass

    # A better regex approach:
    for comp in components_to_remove:
        new_imports_content = re.sub(r'\b' + comp + r'\b\s*,?', '', new_imports_content)

    # Clean up trailing commas and multiple commas
    new_imports_content = re.sub(r',\s*,', ',', new_imports_content)
    new_imports_content = re.sub(r',\s*$', '', new_imports_content.strip())
    new_imports_content = re.sub(r'^\s*,', '', new_imports_content)

    content = content[:imports_match.start(1)] + new_imports_content + content[imports_match.end(1):]
    
    # Remove the import statement for these components
    for comp in components_to_remove:
        content = re.sub(r'^import\s+{.*?\b' + comp + r'\b.*?}\s+from\s+[\'"].*?[\'"];?\n?', '', content, flags=re.MULTILINE)
        # Handle cases where multiple components are imported from the same file
        # It's a bit tricky with regex, let's just do a simple replace for common lines
        content = re.sub(r',\s*' + comp + r'\b', '', content)
        content = re.sub(r'\b' + comp + r'\s*,', '', content)
    
    return content

for ts_file in glob.glob(os.path.join(games_dir, '*', '*.component.ts')):
    # Skip idiom since we didn't migrate it
    if 'idiom.component.ts' in ts_file:
        continue

    with open(ts_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = clean_imports(content)
    
    # Also clean up empty imports like `import { } from '...'`
    new_content = re.sub(r'^import\s*{\s*}\s*from\s+[\'"].*?[\'"];?\n?', '', new_content, flags=re.MULTILINE)
    
    if new_content != content:
        with open(ts_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Cleaned {ts_file}")

print("Done cleaning imports")
