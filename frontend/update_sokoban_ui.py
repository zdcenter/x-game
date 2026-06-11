import os

file_path = "src/app/features/games/sokoban/sokoban.component.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Header to add Steps
header_start = content.find("<ng-container header-right>")
header_end = content.find("</ng-container>", header_start)

if header_start != -1 and header_end != -1:
    old_header = content[header_start:header_end + 15]
    new_header = """<ng-container header-right>
          <div class="flex items-center gap-1 sm:gap-2 lg:gap-4">
            @if (store.status() === 'playing' || store.status() === 'finished') {
              <div class="flex items-center gap-1 px-2 lg:px-3 py-1 bg-black/30 rounded-lg text-amber-400 font-bold text-sm lg:text-base border border-amber-500/30 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                <span>{{ store.myMoves() }} <span class="hidden sm:inline">{{ i18n.t('game.moves')() }}</span></span>
              </div>
            }

            @if (store.currentRoomMode() === 'single') {
              <button (click)="showLobby.set(true)" 
                      class="px-2 lg:px-4 py-1 lg:py-1.5 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-xs lg:text-sm font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95">
                <svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.levels_lobby')() }}</span>
              </button>
            }
            <button (click)="isMobileSidebarOpen.set(true)" class="p-1.5 lg:p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-black/10 transition-colors active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </ng-container>"""
    content = content.replace(old_header, new_header)


# 2. Add overflow-y-auto to the container to allow scrolling, and update min height
board_container_str = """<!-- Main Game Area -->
        <div class="relative flex-grow flex flex-col items-center justify-start min-h-0 w-full shrink py-2 px-2 z-10">"""
board_container_new = """<!-- Main Game Area -->
        <div class="relative flex-grow flex flex-col items-center justify-start min-h-0 w-full shrink py-2 px-2 z-10 overflow-y-auto custom-scrollbar">"""
content = content.replace(board_container_str, board_container_new)

# Shrink the board a bit to leave room for the buttons
height_str = "style=\"width: min(95vw, calc(100vh - 280px), 600px); height: min(95vw, calc(100vh - 280px), 600px);\""
height_new = "style=\"width: min(95vw, calc(100vh - 350px), 600px); height: min(95vw, calc(100vh - 350px), 600px);\""
content = content.replace(height_str, height_new)


# 3. Replace the Action Buttons Bar
actions_start = content.find("<!-- Action Buttons Bar underneath the board -->")
actions_end = content.find("</div>\n\n        </div>\n\n        @if (store.status() === 'playing' && store.isDead()) {")

if actions_start != -1 and actions_end != -1:
    old_actions = content[actions_start:actions_end + 6]
    new_actions = """<!-- Action Buttons Bar underneath the board -->
          <div class="grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center w-full max-w-[600px] gap-2 mt-4 z-20 px-2 pb-6 shrink-0">
            <!-- Back to Lobby -->
            <button class="flex flex-col items-center justify-center px-2 py-2 rounded-xl font-bold text-white shadow-lg transition-all bg-slate-700/80 hover:bg-slate-600 backdrop-blur-sm active:scale-95 text-xs lg:text-sm border border-slate-600/50"
                    (click)="onLeaveClick()">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 lg:h-8 lg:w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>{{ i18n.t('game.back')() }}</span>
            </button>

            <!-- Undo -->
            <button class="flex flex-col items-center justify-center px-2 py-2 rounded-xl font-bold text-white shadow-lg transition-all bg-sky-600/80 hover:bg-sky-500 backdrop-blur-sm active:scale-95 text-xs lg:text-sm border border-sky-500/50"
                    (click)="store.undo()">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 lg:h-8 lg:w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span>{{ i18n.t('game.undo')() }}</span>
            </button>
            
            <!-- Restart -->
            <button class="flex flex-col items-center justify-center px-2 py-2 rounded-xl font-bold text-white shadow-lg transition-all bg-red-600/80 hover:bg-red-500 backdrop-blur-sm active:scale-95 text-xs lg:text-sm border border-red-500/50"
                    (click)="handleRestart()">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 lg:h-8 lg:w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ i18n.t('game.restart')() }}</span>
            </button>
            
            @if (store.currentRoomMode() === 'single') {
              <!-- Hint -->
              <app-hint-button layout="compact" (hintApplied)="applyHint()" class="col-span-3 sm:col-auto mt-2 sm:mt-0 w-full sm:w-auto"></app-hint-button>

              <div class="col-span-3 flex gap-2 w-full mt-2">
                <button class="flex-1 flex justify-center items-center gap-1 px-3 py-3 rounded-xl font-bold text-white shadow-lg transition-all bg-indigo-600/80 hover:bg-indigo-500 backdrop-blur-sm active:scale-95 text-sm lg:text-base border border-indigo-500/50"
                        (click)="store.prevLevel()"
                        [disabled]="store.currentLevelNum() <= 1"
                        [class.opacity-50]="store.currentLevelNum() <= 1">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  {{ i18n.t('game.prev_level')() }}
                </button>
                <button class="flex-1 flex justify-center items-center gap-1 px-3 py-3 rounded-xl font-bold text-white shadow-lg transition-all bg-indigo-600/80 hover:bg-indigo-500 backdrop-blur-sm active:scale-95 text-sm lg:text-base border border-indigo-500/50"
                        (click)="store.nextLevel()"
                        [disabled]="!store.hasNextLevel()"
                        [class.opacity-50]="!store.hasNextLevel()">
                  {{ i18n.t('game.next_level')() }}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            }
          </div>"""
    content = content.replace(old_actions, new_actions)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Sokoban Component UI Updated.")
