import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, effect, untracked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SudokuStore } from './store/sudoku.store';
import { SudokuLobbyComponent } from './components/sudoku-lobby/sudoku-lobby.component';
import { SudokuBoardComponent } from './components/sudoku-board/sudoku-board.component';
import { SudokuNumpadComponent } from './components/sudoku-numpad/sudoku-numpad.component';
import { SudokuToolsComponent } from './components/sudoku-tools/sudoku-tools.component';
import { SudokuRoomComponent } from './components/sudoku-room/sudoku-room.component';
import { SudokuPkStealComponent } from './components/sudoku-pk-steal/sudoku-pk-steal.component';
import { SudokuPkSpeedComponent } from './components/sudoku-pk-speed/sudoku-pk-speed.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { AudioService } from '../../../core/services/audio.service';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { BaseGameComponent } from '../../../core/utils/base-game.component';

@Component({
  selector: 'app-sudoku',
  standalone: true,
  imports: [
    CommonModule, 
    SudokuLobbyComponent, 
    SudokuBoardComponent, 
    SudokuNumpadComponent,
    SudokuToolsComponent,
    SudokuRoomComponent,
    SudokuPkStealComponent,
    SudokuPkSpeedComponent,
    GameResultOverlayComponent,
    GameLobbyPanelComponent
  ],
  providers: [SudokuStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col lg:flex-row h-[calc(100vh-64px)] w-full overflow-hidden p-2 lg:p-4 gap-2 lg:gap-4 bg-[var(--color-bg-main)]">
      
      <!-- LEFT: Game Content -->
      <div class="flex-grow flex flex-col relative min-w-0 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-card)] shadow-xl overflow-hidden">
        @if (view() === 'lobby') {
        <app-sudoku-lobby class="flex-grow flex flex-col min-h-0"
          (levelSelect)="startLevel($event)">
        </app-sudoku-lobby>
      } @else if (view() === 'room') {
        <app-sudoku-room></app-sudoku-room>
      } @else if (view() === 'countdown') {
        <!-- Countdown Overlay -->
        <div class="flex-grow flex flex-col items-center justify-center bg-[var(--color-bg-card)] relative">
          <div class="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-cyan-900/30"></div>
          <div class="relative z-10 flex flex-col items-center gap-6">
            <h2 class="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] animate-pulse">
              {{ gameTimer.countdownDisplay() }}
            </h2>
            <p class="text-[var(--color-text-secondary)] font-bold tracking-[0.3em] uppercase text-sm sm:text-base">{{ i18n.t('game.get_ready')() }}</p>
            <div class="flex items-center gap-3 mt-4">
              <span class="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">{{ i18n.t('game.mode')() }}:</span>
              <span class="text-sm font-bold text-[var(--color-accent-from)]">{{ store.currentMode() === 'pk_steal' ? i18n.t('game.sudoku_pk_steal_label')() : i18n.t('game.sudoku_pk_speed_label')() }}</span>
            </div>
          </div>
        </div>
      } @else {
        <!-- PLAY VIEW -->
        @if (store.currentMode() === 'pk_steal') {
          <app-sudoku-pk-steal></app-sudoku-pk-steal>
        } @else if (store.currentMode() === 'pk_speed') {
          <app-sudoku-pk-speed></app-sudoku-pk-speed>
        } @else {
          <!-- Single Player -->
          <div class="flex-grow flex flex-col p-2 md:p-6 gap-2 md:gap-6 overflow-y-auto md:overflow-hidden relative">
            
            <!-- Top Navigation Bar with Progress -->
            <div class="flex flex-col bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border-card)] shadow-md shrink-0 w-full max-w-[500px] md:max-w-none mx-auto overflow-hidden relative">
              <div class="flex justify-between items-center p-3 md:p-4">
                <button (click)="store.view.set('lobby')" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm lg:text-base mr-2 z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                  </svg>
                  <span class="hidden sm:inline">{{ i18n.t('game.back')() }}</span>
                </button>
                <h1 class="text-xl lg:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 uppercase drop-shadow-sm flex items-center gap-2">
                  <span>Sudoku</span>
                </h1>
                

                
                <div class="flex flex-col items-center z-10">
                  <div class="text-[var(--color-text-main)] font-black opacity-80 uppercase tracking-widest text-sm md:text-base flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                      {{ store.currentMode() === 'single' ? i18n.t('game.single_label')() : (store.currentMode() === 'pk_steal' ? i18n.t('game.pk_steal_label')() : i18n.t('game.pk_speed_label')()) }}
                    </span>
                    {{ store.currentPuzzleId() }}
                  </div>
                </div>

                <div class="flex items-center gap-2 z-10">
                  @if (store.currentMode() !== 'single') {
                    <button (click)="store.leaveRoom()" class="px-2 lg:px-4 py-1 lg:py-2 bg-red-900/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/50 rounded-lg lg:rounded-xl text-[10px] lg:text-sm font-bold transition-colors flex items-center gap-1 lg:gap-2 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span class="hidden sm:inline">{{ i18n.t('game.leave')() || 'Leave' }}</span>
                    </button>
                  }
                  @if (view() === 'play' || view() === 'room') {
                    <button (click)="isMobileSidebarOpen.set(true)" class="lg:hidden p-1.5 md:p-2 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-lg text-emerald-400 shadow-sm active:scale-95 transition-all z-10 hover:bg-[var(--color-bg-card)]">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                    </button>
                  }
                  <div class="font-mono text-lg md:text-xl font-bold text-emerald-400 font-digital tracking-widest bg-black/40 px-3 py-1 rounded-md">
                    {{ gameTimer.formatTime(store.timeSpent()) }}
                  </div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="w-full h-1.5 bg-black/20 relative group">
                <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300" 
                     [style.width.%]="(store.filledCells() / 81) * 100">
                </div>
                <!-- Tooltip -->
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span class="text-[10px] font-bold text-white bg-black/80 px-2 rounded-full absolute -top-6 whitespace-nowrap shadow-md">
                    {{ store.filledCells() }} / 81
                  </span>
                </div>
              </div>
            </div>

            <div class="flex-grow flex flex-col md:grid md:grid-cols-[minmax(0,500px)_64px] justify-start md:justify-center md:content-start items-center md:items-start gap-2 md:gap-6 min-h-0 w-full max-w-[500px] md:max-w-none mx-auto">
              <!-- Victory Overlay -->
              @if (store.isFinished() && store.currentMode() === 'single') {
              <app-game-result-overlay
                [status]="'win'"
                [title]="i18n.t('game.win')()"
                [promptText]="i18n.t('game.sudoku.next_level_prompt')() || 'Level cleared! Play next?'"
                [stats]="[{label: 'TIME', value: gameTimer.formatTime(store.timeSpent())}]"
                [showCancel]="true"
                [showNextLevel]="true"
                (cancel)="store.view.set('lobby')"
                (nextLevel)="playNextLevel()">
              </app-game-result-overlay>
            }

              <div class="order-1 relative min-w-0 w-full" [class.animate-board-shake]="store.isFinished() && store.currentMode() === 'single'">
                <app-sudoku-board class="w-full"></app-sudoku-board>
              </div>

              <div class="order-2 md:order-none md:col-start-2 md:row-start-1 md:row-span-2 w-full md:w-16 flex-shrink-0 mt-1 md:mt-0">
                <app-sudoku-numpad></app-sudoku-numpad>
              </div>

              <div class="order-3 md:order-none md:col-start-1 md:row-start-2 w-full mt-1 md:mt-0">
                <app-sudoku-tools class="w-full"></app-sudoku-tools>
              </div>
            </div>
          </div>
        }
      }
      </div>

      <!-- Mobile Sidebar Overlay Backdrop -->
      @if (isMobileSidebarOpen()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" (click)="isMobileSidebarOpen.set(false)"></div>
      }

      <!-- RIGHT: Social Lobby Sidebar (Drawer) -->
      <div class="flex-shrink-0 flex-col w-full lg:w-80 transition-transform duration-300"
           [ngClass]="{
             'fixed inset-y-0 right-0 z-50 w-[85vw] sm:w-96 bg-[var(--color-bg-main)] shadow-2xl p-4 lg:relative lg:inset-auto lg:w-80 lg:shadow-none lg:p-0 lg:z-auto lg:flex lg:translate-x-0': true,
             'translate-x-0 flex': isMobileSidebarOpen(),
             'translate-x-full hidden lg:flex': !isMobileSidebarOpen(),
             'max-lg:!hidden': store.roomId() !== ''
           }">
           
           <div class="flex justify-between items-center mb-4 lg:hidden">
             <h3 class="font-bold text-lg text-[var(--color-text-main)]">{{ i18n.t('game.room_info')() || 'Room Info' }}</h3>
             <button (click)="isMobileSidebarOpen.set(false)" class="p-2 text-slate-400 hover:text-[var(--color-text-main)] rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)]">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
           </div>
        <app-game-lobby-panel
          [currentGameId]="'sudoku'"
          [gameModes]="sudokuModes"
          [difficulties]="difficulties"
          [currentRoomId]="store.roomId()"
          (joinRoom)="handleJoinRoom($event)"
          (createRoom)="handleCreateRoom($event)"
          (dismissRoom)="handleDismissRoom()"
        ></app-game-lobby-panel>
      </div>

    </div>
  `
})
export class SudokuComponent extends BaseGameComponent implements OnInit, OnDestroy {
  store = inject(SudokuStore);
  router = inject(Router);
  http = inject(HttpClient);
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  private roomLifecycle!: RoomLifecycleHandle;
  private gameRegistry = inject(GameRegistryService);
  
  view = this.store.view;
  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  sudokuModes = [
    { id: 'pk_steal', labelKey: 'game.sudoku_pk_steal_label', icon: '⚡', descKey: 'game.sudoku_pk_steal_desc' },
    { id: 'pk_speed', labelKey: 'game.sudoku_pk_speed_label', icon: '⏱️', descKey: 'game.sudoku_pk_speed_desc' }
  ];

  difficulties = [
    { id: 'easy', labelKey: 'game.diff_easy', desc: 'A gentle start' },
    { id: 'medium', labelKey: 'game.diff_medium', desc: 'A fair challenge' },
    { id: 'hard', labelKey: 'game.diff_hard', desc: 'For experienced players' },
    { id: 'expert', labelKey: 'game.diff_expert', desc: 'True test of skill' }
  ];

  constructor() {
    super();
    // Register game metadata
    this.gameRegistry.register({
      id: 'sudoku',
      route: '/games/sudoku',
      titleKey: 'lobby.sudoku',
      iconEmoji: '🔢',
      modes: this.sudokuModes,
      difficulties: this.difficulties,
    });

    // Watch for countdown trigger
    effect(() => {
      const status = this.store.gameStatus();
      if (status === 'starting') {
        untracked(() => this.gameTimer.startCountdown());
      }
    });

    // Room lifecycle: cross-game join, reconnect, room dismissed handling
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'sudoku',
      getCurrentMode: () => this.store.currentMode(),
      onLeaveRoom: () => this.store.leaveRoom(),
    });
  }

  override ngOnInit() {
    super.ngOnInit(); // connects lobby WS
    this.view.set('lobby');

    // Check for cross-game join or reconnect
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      this.store.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host);
    }
  }

  override ngOnDestroy() {
    this.wsService.disconnect('sudoku');
    this.gameTimer.stopCountdown();
  }

  startLevel(level: {id: string, puzzle: string, savedState?: string, timeSpent?: number}) {
    this.store.currentMode.set('single');
    this.store.currentPuzzleId.set(level.id);
    this.store.initBoard(level.puzzle, level.savedState, level.timeSpent);
    this.view.set('play');
  }

  playNextLevel() {
    const currentId = this.store.currentPuzzleId();
    if (!currentId) return;
    const match = currentId.match(/^(.*)-(\d+)$/);
    if (!match) {
      this.store.view.set('lobby');
      return;
    }
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    const nextId = `${prefix}-${nextNum.toString().padStart(numStr.length, '0')}`;
    
    this.http.get<any>(`/api/v1/sudoku/puzzle/${nextId}`).subscribe({
      next: (res) => {
        this.store.currentPuzzleId.set(res.puzzle.id);
        this.store.initBoard(res.puzzle.puzzle, res.progress?.current_state, res.progress?.time_spent);
      },
      error: () => {
        // Next level doesn't exist, back to lobby
        (this.store as any).toast.show(this.i18n.t('lobby.coming_soon')(), 'info');
        this.store.view.set('lobby');
      }
    });
  }
}
