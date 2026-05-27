import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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
                <button (click)="store.view.set('lobby')" class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm md:text-base z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
                  </svg>
                  {{ i18n.t('game.back')() }}
                </button>
                
                <div class="flex flex-col items-center z-10">
                  <div class="text-[var(--color-text-main)] font-black opacity-80 uppercase tracking-widest text-sm md:text-base flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                      {{ store.currentMode() === 'single' ? i18n.t('game.single_label')() : (store.currentMode() === 'pk_steal' ? i18n.t('game.pk_steal_label')() : i18n.t('game.pk_speed_label')()) }}
                    </span>
                    {{ store.currentPuzzleId() }}
                  </div>
                </div>

                <div class="font-mono text-lg md:text-xl font-bold text-emerald-400 font-digital tracking-widest bg-black/40 px-3 py-1 rounded-md z-10">
                  {{ formatTime(store.timeSpent()) }}
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
                [stats]="[{label: 'TIME', value: formatTime(store.timeSpent())}]"
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

      <!-- RIGHT: Social Lobby Sidebar (30%) -->
      <div class="w-full lg:w-80 flex-shrink-0 flex-col min-h-[400px] lg:min-h-0"
           [ngClass]="(view() === 'play' || view() === 'room') ? 'hidden lg:flex' : 'flex'">
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
export class SudokuComponent implements OnInit, OnDestroy {
  store = inject(SudokuStore);
  route = inject(ActivatedRoute);
  http = inject(HttpClient);
  i18n = inject(I18nService);
  wsService = inject(WebSocketService);
  authStore = inject(AuthStore);
  
  view = this.store.view;
  playerId = this.authStore.currentUser()?.username || 'Guest';

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
    effect(() => {
      const status = this.store.gameStatus();
      const currentMode = this.store.currentMode();
      
      // Auto-transition to play view when game starts in multiplayer
      if (status === 'playing' && currentMode !== 'single' && this.view() === 'room') {
        if (this.store.board().length === 0) {
          const raw = this.store.rawState() as any;
          if (raw.puzzle) {
            this.store.initBoard(raw.puzzle);
          }
        }
        this.view.set('play');
      }
    });

    // Watch for room dismissed events
    effect(() => {
      const dismissed = this.wsService.roomDismissedEvent();
      if (dismissed > 0 && untracked(() => this.store.currentMode()) !== 'single') {
        (this.store as any).toast.show(this.i18n.t('game.room_dismissed_msg')() || 'The host has dismissed the room.', 'info');
        this.store.leaveRoom();
      }
    });
  }

  ngOnInit() {
    this.view.set('lobby');
    this.wsService.connectLobby(this.playerId, this.playerId);

    this.route.queryParams.subscribe(params => {
      if (params['roomId']) {
        this.store.joinRoom(
          params['roomId'], 
          params['mode'] || 'pk_steal', 
          params['difficulty'] || 'easy', 
          params['host']
        );
        // Clean URL to prevent re-join on refresh
        window.history.replaceState({}, '', '/sudoku');
      }
    });
  }

  ngOnDestroy() {
    this.wsService.disconnectLobby();
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

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string}) {
    if (this.store.roomId() === event.roomId) return;
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
  }

  handleCreateRoom(event: {name: string, mode: string, difficulty: string}) {
    this.store.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
  }

  handleDismissRoom() {
    this.wsService.send({ type: 'dismiss_room' });
    this.store.leaveRoom();
  }
}
