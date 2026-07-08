import os
import re
import glob

games_dir = 'src/app/features/games'

games = ['sliding', 'classic2048', 'hashi', 'sudoku', 'math24', 'nonogram', 'idiom']

for game_id in games:
    game_html = os.path.join(games_dir, game_id, f'{game_id}.component.html')
    if not os.path.exists(game_html):
        print(f"File not found: {game_html}")
        continue

    with open(game_html, 'r', encoding='utf-8') as f:
        content = f.read()

    if '<app-game-layout' in content:
        continue

    # 1. Extract Header Properties
    icon_match = re.search(r'<div game-icon[^>]*>(.*?)</div>', content)
    icon = icon_match.group(1).strip() if icon_match else "🎮"
    
    title_match = re.search(r'\[title\]="([^"]+)"', content)
    title_binding = title_match.group(1) if title_match else f"i18n.t('game.{game_id}.title')()"
    
    icon_grad_match = re.search(r'iconGradientClass="([^"]+)"', content)
    icon_grad = icon_grad_match.group(1) if icon_grad_match else "from-blue-500 to-indigo-500"
    
    title_grad_match = re.search(r'titleGradientClass="([^"]+)"', content)
    title_grad = title_grad_match.group(1) if title_grad_match else "from-blue-400 to-indigo-400"
    
    shadow_match = re.search(r'shadowClass="([^"]+)"', content)
    shadow = shadow_match.group(1) if shadow_match else "shadow-blue-500/20"
    
    header_bg_match = re.search(r'headerBgClass="([^"]+)"', content)
    header_bg = header_bg_match.group(1) if header_bg_match else "dark:bg-gradient-to-r dark:from-blue-900/30 dark:to-indigo-900/30 px-4 lg:px-6 py-2 lg:py-3 mb-0"

    # 2. Extract Core Area
    # Sudoku and Nonogram have a complex if-else for lobby/room/countdown. 
    # Let's just find the `<!-- CENTER: Game Arena -->` and grab the content inside the `.flex-grow.flex.flex-col.items-center.relative` div.
    
    center_start = content.find('<!-- CENTER: Game Arena -->')
    if center_start == -1:
        # Fallback: find the first div after SEO Description
        center_start = content.find('<!-- LEFT: SEO Description')
        if center_start != -1:
            # find the next <div class="flex-grow
            center_start = content.find('<div class="flex-grow flex flex-col items-center', center_start)
    else:
        center_start = content.find('<div class="flex-grow flex flex-col items-center', center_start)
        
    if center_start == -1:
        print(f"[{game_id}] Could not find center arena div start.")
        continue
        
    # Find matching closing div for center arena
    div_level = 0
    center_end = -1
    pos = center_start
    while pos < len(content):
        tag_match = re.search(r'<(div|/div)\b[^>]*>', content[pos:])
        if not tag_match:
            break
        tag = tag_match.group(1)
        if tag == 'div':
            div_level += 1
        else:
            div_level -= 1
            
        pos += tag_match.end()
        if div_level == 0:
            center_end = pos
            break
            
    if center_end == -1:
        print(f"[{game_id}] Could not find matching end div.")
        continue

    # Extract the center arena HTML
    center_div_html = content[center_start:center_end]
    
    # We want to strip the outer `<div class="flex-grow flex flex-col items-center...`
    # and if there is a `.backdrop-blur-xl border rounded-2xl` inner wrapper, strip that too, but only if it's unconditionally wrapping.
    # In games like Sudoku, the wrapper is inside @if. 
    # For now, let's just pass `center_div_html` into <app-game-layout> but strip the outer `<div class="flex-grow...` tag.
    
    core_html = re.sub(r'^<div[^>]+>|<\/div>\s*$', '', center_div_html).strip()

    # Construct the new HTML
    new_html = f"""<app-game-layout
  [gameId]="'{game_id}'"
  [title]="{title_binding}"
  [subtitle]="getSubtitle()"
  icon="{icon}"
  iconGradientClass="{icon_grad}"
  titleGradientClass="{title_grad}"
  shadowClass="{shadow}"
  headerBgClass="{header_bg}"
  [currentRoomMode]="store.currentRoomMode()"
  [currentRoomId]="currentRoomId()"
  [status]="store.status()"
  [showRules]="showRules()"
  [showMobileSidebar]="isMobileSidebarOpen()"
  [showPlayAgainBtn]="store.currentRoomMode() === GameMode.Single && store.status() === GameStatus.Finished && showOverlay()"
  [showLeaveBtn]="store.currentRoomMode() !== GameMode.Single"
  (rulesClosed)="showRules.set(false)"
  (rulesOpen)="showRules.set(true)"
  (titleClick)="handleTitleClick()"
  (back)="goBack()"
  (playAgain)="store.startGame()"
  (navigateToPk)="navigateToPkArena()"
  (joinRoom)="handleJoinRoom($event)"
  (createRoom)="handleCreateRoom($event)"
  (mobileSidebarClosed)="isMobileSidebarOpen.set(false)"
>
{core_html}
</app-game-layout>
"""

    ts_file = game_html.replace('.html', '.ts')
    if os.path.exists(ts_file):
        with open(ts_file, 'r', encoding='utf-8') as f:
            ts_content = f.read()
            
        if 'GameLayoutComponent' not in ts_content:
            ts_content = re.sub(
                r"import { GameHeaderComponent",
                r"import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';\nimport { GameHeaderComponent",
                ts_content
            )
            
            ts_content = re.sub(
                r'imports:\s*\[(.*?)\]',
                lambda m: 'imports: [' + m.group(1).replace('GameHeaderComponent', 'GameLayoutComponent').replace(', GameLobbyPanelComponent', '').replace(', GameRulesModalComponent', '') + ']',
                ts_content,
                flags=re.DOTALL
            )
            
        with open(ts_file, 'w', encoding='utf-8') as f:
            f.write(ts_content)

    with open(game_html, 'w', encoding='utf-8') as f:
        f.write(new_html)
        
    print(f"Migrated {game_id}")
