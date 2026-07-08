import os
import re
import glob

games_dir = 'src/app/features/games'

# Fix HTML files
for html_file in glob.glob(os.path.join(games_dir, '*', '*.component.html')):
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace currentRoomId() with store.roomId()
    content = content.replace('[currentRoomId]="currentRoomId()"', '[currentRoomId]="store.roomId()"')
    
    # We will let TS handle subtitle.
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix TS files
for ts_file in glob.glob(os.path.join(games_dir, '*', '*.component.ts')):
    with open(ts_file, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False

    if 'export class HashiComponent' in content:
        if 'showRules' not in content:
            content = content.replace('export class HashiComponent extends BaseGameComponent {', 'export class HashiComponent extends BaseGameComponent {\n  showRules = signal(false);\n  showOverlay = signal(false);\n')
            
            # import signal if needed
            if 'signal' not in content:
                content = content.replace('import { Component', 'import { Component, signal')
            changed = True

    if 'export class NonogramComponent' in content:
        if 'getSubtitle()' not in content:
            content = content.replace('export class NonogramComponent', 'export class NonogramComponent')
            # insert after class declaration
            content = re.sub(r'(export class NonogramComponent [^{]*{)', r'\1\n  getSubtitle() { return ""; }\n', content)
            changed = True

    if 'export class SlidingComponent' in content:
        if 'getSubtitle()' not in content:
            content = re.sub(r'(export class SlidingComponent [^{]*{)', r'\1\n  getSubtitle() { return ""; }\n', content)
            changed = True

    if changed:
        with open(ts_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {ts_file}")

print("Done fixing HTML and TS files")
