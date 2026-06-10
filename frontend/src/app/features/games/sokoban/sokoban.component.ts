import { Component, inject, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { SokobanStore } from './store/sokoban.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { ToastService } from '../../../core/services/toast.service';
import { HintButtonComponent } from '../../../shared/components/hint-button/hint-button.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { SokobanBoardComponent } from './components/board/sokoban-board.component';
import { SokobanLobbyComponent } from './components/sokoban-lobby/sokoban-lobby.component';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';

@Component({
  selector: 'app-sokoban',
  standalone: true,
  imports: [
    CommonModule,
    GameHeaderComponent,
    PlayerBadgeComponent,
    GameResultOverlayComponent,
    HintButtonComponent,
    GameWaitingRoomComponent,
    GameStartingOverlayComponent,
    GameLobbyPanelComponent,
    SokobanBoardComponent,
    SokobanLobbyComponent,
    GameRulesModalComponent
  ],
  template: `
<div class="flex-grow flex flex-col lg:flex-row h-[calc(100vh-64px)] p-1 lg:p-4 gap-2 lg:gap-6 transition-colors duration-300 bg-[var(--color-bg-base)] text-[var(--color-text-main)] overflow-y-auto lg:overflow-hidden select-none overscroll-none">
    <div class="flex-grow flex flex-col items-center relative min-w-0 min-h-[600px] lg:min-h-0">
      @if (showLobby()) {
        <app-sokoban-lobby class="flex-grow flex flex-col w-full h-full min-h-0" (openLobby)="isMobileSidebarOpen.set(true)" (levelSelect)="onLevelSelect($event)"></app-sokoban-lobby>
      } @else {
      <div class="w-full h-full flex flex-col overflow-hidden backdrop-blur-xl border rounded-2xl lg:rounded-3xl p-3 lg:p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300"
           style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        <app-game-header
        [title]="i18n.t('lobby.sokoban')()"
        [subtitle]="getModeName() + ' - ' + getDifficultyName() + (store.currentRoomMode() === 'single' ? (' - ' + i18n.t('game.level')() + ' ' + store.currentLevelNum()) : '')"
        iconGradientClass="from-amber-400 to-orange-500"
        titleGradientClass="from-amber-300 to-orange-400"
        shadowClass="shadow-orange-500/20"
        headerBgClass="bg-gradient-to-r from-amber-900/30 to-orange-900/30"
        (back)="onLeaveClick()"
        (rules)="showRules.set(true)"
      >
        <div game-icon>📦</div>

        <ng-container header-right>
          <div class="flex items-center gap-1 sm:gap-2 lg:gap-4">
            @if (store.currentRoomMode() === 'single') {
              <button (click)="showLobby.set(true)" 
                      class="px-2 lg:px-4 py-1 lg:py-1.5 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-xs lg:text-sm font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95">
                <svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span class="hidden sm:inline"><ng-container i18n="@@game.levels_lobby">Lobby</ng-container></span>
              </button>
            }
            <button (click)="isMobileSidebarOpen.set(true)" class="p-1.5 lg:p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-black/10 transition-colors active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        </ng-container>
      </app-game-header>

      @if (store.status() === 'waiting') {
        <app-game-waiting-room
          [gameId]="'sokoban'"
          [mode]="store.currentRoomMode()"
          [roomId]="store.roomId()"
          [difficulty]="store.currentDifficulty()"
          [players]="store.playersList()"
          [hostId]="store.hostId()"
          [currentUserId]="playerId"
          [readyPlayers]="store.readyPlayers()"
          (start)="store.startGame()"
          (leave)="onLeaveClick()"
          (changeSettings)="openChangeSettings()"
          (ready)="store.ready()"
          (cancelReady)="store.cancelReady()"
          (kick)="store.kickPlayer($event)"
        ></app-game-waiting-room>
      }

      @if (store.status() === 'starting') {
        <app-game-starting-overlay [countdown]="gameTimer.countdownDisplay()"></app-game-starting-overlay>
      }

      @if (store.status() === 'playing' || store.status() === 'finished') {
        <div class="flex-none py-2 mb-2 border-b border-[var(--color-border-card)] w-full relative z-10">
          <div class="w-full max-w-[800px] mx-auto flex items-center gap-2 lg:gap-4 px-2 overflow-x-auto custom-scrollbar" 
               [class.justify-center]="store.currentRoomMode() === 'single'">
            
            <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
              [playerName]="playerId"
              [isHost]="store.hostId() === playerId"
              [isMe]="true"
              [stats]="[
                { label: i18n.t('game.moves')(), value: store.myMoves() }
              ]"
              [status]="store.myPlayerState()?.status || 'playing'"
            ></app-player-badge>

            @for (opp of store.opponents(); track opp.id) {
              <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
                [playerName]="opp.id"
                [isHost]="opp.isHost"
                [stats]="[
                  { label: i18n.t('game.moves')(), value: opp.moves }
                ]"
                [status]="opp.status"
              ></app-player-badge>
            }
          </div>
        </div>

        <!-- Main Game Area -->
        <div class="relative flex-grow flex flex-col items-center justify-start min-h-0 w-full shrink py-2 px-2 z-10">
          
          <div class="relative flex items-center justify-center shrink-0 w-full"
               style="width: min(95vw, calc(100vh - 280px), 600px); height: min(95vw, calc(100vh - 280px), 600px);">
            <app-sokoban-board class="w-full h-full"></app-sokoban-board>

            @if (store.status() === 'finished') {
              <app-game-result-overlay
                currentGameId="sokoban"
                [status]="getGameResult()"
                [title]="getGameResult() === 'win' ? i18n.t('game.you_win')() : i18n.t('game.you_lose')()"
                [showNextLevel]="store.hasNextLevel() && store.currentRoomMode() === 'single'"
                [showRestart]="store.currentRoomMode() === 'single' || store.hostId() === playerId"
                [showLeave]="store.currentRoomMode() === 'single' || store.hostId() !== playerId"
                [showDismiss]="store.currentRoomMode() !== 'single' && store.hostId() === playerId"
                (nextLevel)="handleNextLevel()"
                (restart)="handleRestart()"
                (leave)="onLeaveClick()"
                (dismiss)="handleDismissRoom()"
                class="absolute inset-0 z-30 rounded-xl lg:rounded-2xl overflow-hidden backdrop-blur-md">
              </app-game-result-overlay>
            }
          </div>

          <!-- Action Buttons Bar underneath the board -->
          <div class="flex flex-wrap items-center justify-center w-full max-w-[600px] gap-2 mt-4 z-20 px-2">
            <button class="px-3 lg:px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-all bg-slate-700/80 hover:bg-slate-600 backdrop-blur-sm active:scale-95 text-sm lg:text-base border border-slate-600/50"
                    (click)="store.undo()">
              {{ i18n.t('game.undo')() }}
            </button>
            
            @if (store.currentRoomMode() === 'single') {
              <button class="px-3 lg:px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-all bg-indigo-600/80 hover:bg-indigo-500 backdrop-blur-sm active:scale-95 text-sm lg:text-base border border-indigo-500/50 flex-1 lg:flex-none"
                      (click)="store.prevLevel()"
                      [disabled]="store.currentLevelNum() <= 1"
                      [class.opacity-50]="store.currentLevelNum() <= 1">
                {{ i18n.t('game.prev_level')() }}
              </button>
              <button class="px-3 lg:px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-all bg-indigo-600/80 hover:bg-indigo-500 backdrop-blur-sm active:scale-95 text-sm lg:text-base border border-indigo-500/50 flex-1 lg:flex-none"
                      (click)="store.nextLevel()"
                      [disabled]="!store.hasNextLevel()"
                      [class.opacity-50]="!store.hasNextLevel()">
                {{ i18n.t('game.next_level')() }}
              </button>
            }
            @if (store.currentRoomMode() === 'single') {
              <app-hint-button layout="compact" (hintApplied)="applyHint()"></app-hint-button>
            }
            
            <div class="flex-grow hidden lg:block"></div>
            
            <button class="flex items-center justify-center px-3 lg:px-4 py-2 rounded-lg font-bold text-white shadow-lg transition-all bg-red-600/80 hover:bg-red-500 backdrop-blur-sm active:scale-95 text-sm lg:text-base border border-red-500/50"
                    title="{{ i18n.t('game.restart')() }}"
                    (click)="store.restart()">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

        </div>

        @if (store.status() === 'playing' && store.isDead()) {
          <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <h2 class="text-4xl md:text-6xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
              {{ i18n.t('game.spectating')() }}
            </h2>
          </div>
        }
      }
      </div>
      }
    </div>

    <!-- Mobile Sidebar Overlay Backdrop -->
    @if (isMobileSidebarOpen()) {
      <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-40" 
           [class.lg:hidden]="!(store.status() === 'playing' && store.currentRoomMode() !== 'single')"
           (click)="isMobileSidebarOpen.set(false)"></div>
    }

    <!-- RIGHT: Social Lobby Sidebar (Drawer) -->
    <div class="flex-shrink-0 transition-transform duration-300"
         [ngClass]="{
           'fixed inset-y-0 right-0 z-50 w-[85vw] sm:w-96 bg-[var(--color-bg-main)] shadow-2xl p-4 flex flex-col': true,
           'translate-x-0': isMobileSidebarOpen(),
           'translate-x-full': !isMobileSidebarOpen(),
           'lg:relative lg:inset-auto lg:w-[400px] lg:shadow-none lg:p-0 lg:z-20 lg:translate-x-0 lg:flex': !(store.status() === 'playing' && store.currentRoomMode() !== 'single')
         }">
      <div class="flex justify-between items-center mb-4 lg:hidden"
           [class.lg:flex]="store.status() === 'playing' && store.currentRoomMode() !== 'single'">
        <h3 class="font-bold text-lg text-[var(--color-text-main)]"><ng-container i18n="@@game.room_info">Room Info</ng-container></h3>
        <button (click)="isMobileSidebarOpen.set(false)" class="p-2 bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <app-game-lobby-panel
        #lobbyPanel
        class="flex-grow flex"
        [currentGameId]="'sokoban'"
        [currentRoomId]="store.roomId()"
        (joinRoom)="handleJoinRoom($event)"
        (createRoom)="handleCreateRoom($event)">
      </app-game-lobby-panel>
    </div>
  </div>

  <app-game-rules-modal [gameId]="'sokoban'" [isOpen]="showRules()" (closed)="showRules.set(false)"></app-game-rules-modal>
  `
})
export class SokobanComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(SokobanStore);
  private authStore = inject(AuthStore);
  private crossGameJoin = inject(CrossGameJoinService);
  private gameRegistry = inject(GameRegistryService);
  private router = inject(Router);
  i18n = inject(I18nService);
  toastService = inject(ToastService);
  
  private roomLifecycle!: RoomLifecycleHandle;

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;
  override isMobileSidebarOpen = signal(false);
  showLobby = signal(true);
  showRules = signal(false);

  predefinedDifficulties = this.gameRegistry.getConfig('sokoban')?.difficulties || [];

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'sokoban',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveGame();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    
    const pendingCross = this.crossGameJoin.consumePendingJoin('sokoban');
    if (pendingCross) {
      if (pendingCross.password) this.wsService.setPendingPassword(pendingCross.password);
      this.store.joinRoom(pendingCross.roomId, pendingCross.mode, pendingCross.difficulty, pendingCross.host);
      if (pendingCross.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(pendingCross.roomId, pendingCross.mode, pendingCross.difficulty, pendingCross.host);
      }
      return;
    }

    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      if (pending.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      this.store.joinRoom('', 'single', 'beginner', this.playerId);
    }
  }

  getModeName() {
    const mode = this.store.currentRoomMode();
    const key = this.gameRegistry.getModeLabel('sokoban', mode);
    return key ? this.i18n.t(key)() : mode;
  }

  getDifficultyName() {
    const diff = this.store.currentDifficulty();
    const key = this.gameRegistry.getDifficultyLabel('sokoban', diff);
    return key ? this.i18n.t(key)() : diff;
  }

  changeSingleDifficulty(diff: string) {
    this.store.changeSingleDifficulty(diff);
  }

  onLevelSelect(level: {id: string, puzzle: string, difficulty: string, levelNum: number}) {
    this.store.loadLevelFromLobby(level.difficulty, level.puzzle, level.id);
    this.showLobby.set(false);
  }

  changeDifficulty(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.changeSingleDifficulty(target.value);
    }
  }

  openChangeSettings() {
    if (this.lobbyPanel && this.store.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.store.roomId(),
        game: 'sokoban',
        mode: this.store.currentRoomMode(),
        difficulty: this.store.currentDifficulty(),
        host: this.store.hostId()
      });
    }
  }

  override handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string}) {
    super.handleCreateRoom(event);
    if (event.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(this.store.roomId() || event.name, event.mode, event.difficulty, this.playerId);
    }
  }

  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string; password?: string }) {
    super.handleJoinRoom(params);
    if (params.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
  }

  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  getGameResult(): 'win' | 'lose' {
    if (this.store.currentRoomMode() === 'single') return 'win';
    const raw = this.wsService.gameState();
    if (!raw || !raw.winners) return 'lose';
    return raw.winners.includes(this.playerId) ? 'win' : 'lose';
  }

  handleRestart() {
    if (this.store.currentRoomMode() === 'single') {
      this.store.restart();
    } else {
      this.wsService.send({ type: 'restart_game' });
    }
  }

  handleNextLevel() {
    this.store.nextLevel();
  }

  applyHint() {
    const result = this.store.applyHint();
    const msg = this.i18n.t(result.message)() || result.message;
    this.toastService.show(msg, result.success ? 'success' : 'info');
  }

  onLeaveClick() {
    this.store.leaveGame();
    this.router.navigate(['/lobby']);
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveGame();
  }
}
