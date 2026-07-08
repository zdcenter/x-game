import os
import re
import glob

# Path to the games directory
games_dir = 'src/app/features/games'

# Pattern to extract the core game arena content
# We will match everything between the <div ... style="background-color: var(--color-bg-card); border-color: var(--color-border-card)"> 
# and its closing </div>, which is before <!-- RIGHT: Right Column...
pattern = re.compile(
    r'<!-- CENTER: Game Arena -->(.*?)<!-- RIGHT: Right Column',
    re.DOTALL
)

inner_pattern = re.compile(
    r'style="background-color: var\(--color-bg-card\); border-color: var\(--color-border-card\)">\s*(.*?)\s*</div>\s*</div>\s*$',
    re.DOTALL
)

for game_html in glob.glob(os.path.join(games_dir, '*', '*.component.html')):
    game_id = os.path.basename(os.path.dirname(game_html))
    
    with open(game_html, 'r', encoding='utf-8') as f:
        content = f.read()

    # If it already uses app-game-layout, skip
    if '<app-game-layout' in content:
        continue

    # Extract the header attributes if possible
    # We look for <app-game-header ...>
    header_match = re.search(r'<app-game-header\s*\([^>]*>(.*?)</app-game-header>', content, re.DOTALL)
    
    # Actually, it's easier to just construct the <app-game-layout> tag based on standard variables.
    # Almost all games have standard variables.
    
    # We need to extract the core content
    center_match = pattern.search(content)
    if not center_match:
        print(f"Could not find center arena in {game_html}")
        continue
        
    center_content = center_match.group(1)
    core_match = inner_pattern.search(center_content)
    if not core_match:
        print(f"Could not extract core content from {game_html}")
        continue
        
    core_html = core_match.group(1)

    # Some games have specific header titles and icons, we can extract them
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

    # We might need to handle the component TS file to import GameLayoutComponent
    # and remove GameHeaderComponent, GameLobbyPanelComponent, GameRulesModalComponent
    ts_file = game_html.replace('.html', '.ts')
    if os.path.exists(ts_file):
        with open(ts_file, 'r', encoding='utf-8') as f:
            ts_content = f.read()
            
        # Add import for GameLayoutComponent
        if 'GameLayoutComponent' not in ts_content:
            ts_content = re.sub(
                r"import { GameHeaderComponent",
                r"import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';\nimport { GameHeaderComponent",
                ts_content
            )
            
            # Replace imports array
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
