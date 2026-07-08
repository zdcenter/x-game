import os
import re

warnings_data = {
    'block': ['GameLobbyPanelComponent', 'GameRulesModalComponent'],
    'classic2048': ['GameLobbyPanelComponent', 'GameRulesModalComponent'],
    'codebreaker': ['GameRulesModalComponent', 'GameLobbyPanelComponent', 'TutorialOverlayComponent'],
    'drop2048': ['GameLobbyPanelComponent', 'GameRulesModalComponent'],
    'hashi': ['GameLobbyPanelComponent', 'GamePkModeBadgeComponent'],
    'hexa': ['GameLobbyPanelComponent', 'GameRulesModalComponent'],
    'lightsout': ['GameLobbyPanelComponent', 'GameRulesModalComponent'],
    'math24': ['GameLobbyPanelComponent', 'GameRulesModalComponent', 'TutorialOverlayComponent'],
    'minesweeper': ['GamePkModeBadgeComponent'],
    'sudoku': ['GameLobbyPanelComponent', 'TutorialOverlayComponent', 'GameRulesModalComponent', 'GamePkModeBadgeComponent'],
    'watersort': ['TutorialOverlayComponent']
}

base_dir = 'src/app/features/games'

def remove_from_imports_array(content, comps_to_remove):
    # Find the imports: [...] block
    match = re.search(r'imports:\s*\[(.*?)\]', content, re.DOTALL)
    if not match:
        return content
        
    imports_inner = match.group(1)
    new_imports = imports_inner
    
    for comp in comps_to_remove:
        # regex to remove the component from the array
        new_imports = re.sub(r'\b' + comp + r'\b\s*,?', '', new_imports)
        
    # clean up commas
    new_imports = re.sub(r',\s*,', ',', new_imports)
    new_imports = re.sub(r',\s*$', '', new_imports.strip())
    new_imports = re.sub(r'^\s*,', '', new_imports)
    
    return content[:match.start(1)] + new_imports + content[match.end(1):]

for game, comps in warnings_data.items():
    ts_file = os.path.join(base_dir, game, f'{game}.component.ts')
    if os.path.exists(ts_file):
        with open(ts_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = remove_from_imports_array(content, comps)
        
        if new_content != content:
            with open(ts_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {ts_file}")

print("Done safe cleaning")
