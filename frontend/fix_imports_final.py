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

def fix_imports(ts_content, html_content):
    # Find the imports: [...] block
    match = re.search(r'imports:\s*\[(.*?)\]', ts_content, re.DOTALL)
    if not match:
        return ts_content
        
    imports_inner = match.group(1)
    new_imports = imports_inner
    
    # 1. Remove unused components from imports if they are NOT in HTML
    for comp in components_to_remove:
        # Convert component name to selector (e.g. GameLobbyPanelComponent -> app-game-lobby-panel)
        selector = ''
        if comp == 'GameLobbyPanelComponent': selector = 'app-game-lobby-panel'
        elif comp == 'GameRulesModalComponent': selector = 'app-game-rules-modal'
        elif comp == 'TutorialOverlayComponent': selector = 'app-tutorial-overlay'
        elif comp == 'GamePkModeBadgeComponent': selector = 'app-game-pk-mode-badge'
        
        # If selector is NOT in HTML, we must remove it from TS imports to avoid NG8113 warning
        if selector not in html_content:
            new_imports = re.sub(r'\b' + comp + r'\b\s*,?', '', new_imports)
            
    # 2. Add GameLayoutComponent if app-game-layout is in HTML
    if 'app-game-layout' in html_content and 'GameLayoutComponent' not in new_imports:
        new_imports += ', GameLayoutComponent'
        
    # clean up commas
    new_imports = re.sub(r',\s*,', ',', new_imports)
    new_imports = re.sub(r',\s*$', '', new_imports.strip())
    new_imports = re.sub(r'^\s*,', '', new_imports)
    
    new_content = ts_content[:match.start(1)] + new_imports + ts_content[match.end(1):]
    
    # Ensure GameLayoutComponent is imported at the top
    if 'app-game-layout' in html_content and 'import { GameLayoutComponent }' not in new_content:
        import_stmt = "import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';\n"
        # Find last import
        last_import = list(re.finditer(r'^import .*?;$', new_content, re.MULTILINE))
        if last_import:
            pos = last_import[-1].end()
            new_content = new_content[:pos] + '\n' + import_stmt + new_content[pos:]
            
    return new_content

for ts_file in glob.glob(os.path.join(games_dir, '*', '*.component.ts')):
    html_file = ts_file.replace('.ts', '.html')
    if not os.path.exists(html_file):
        continue
        
    with open(ts_file, 'r', encoding='utf-8') as f:
        ts_content = f.read()
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
        
    new_ts_content = fix_imports(ts_content, html_content)
    
    if new_ts_content != ts_content:
        with open(ts_file, 'w', encoding='utf-8') as f:
            f.write(new_ts_content)
        print(f"Fixed {ts_file}")

print("Done fixing all imports correctly")
