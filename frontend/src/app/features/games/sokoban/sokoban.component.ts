import { Component, inject, OnInit, OnDestroy, ViewChild, signal, effect, computed } from '@angular/core';
import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { AdService } from '../../../core/services/ad.service';
import { GameDifficulty, GameId, GameMode, GameStatus } from '../../../core/models/game.model';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { SokobanStore } from './store/sokoban.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { ToastService } from '../../../core/services/toast.service';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { SokobanBoardComponent } from './components/board/sokoban-board.component';
import { SokobanLobbyComponent } from './components/sokoban-lobby/sokoban-lobby.component';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { DailyChallengeService } from '../../../core/services/daily-challenge.service';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';

@Component({
  selector: 'app-sokoban',
  standalone: true,
  imports: [GameSpectatingOverlayComponent, 
    CommonModule,
    GameHeaderComponent,
    PlayerBadgeComponent,
    GameResultOverlayComponent,
    GameWaitingRoomComponent,
    GameStartingOverlayComponent,
    GameLobbyPanelComponent,
    SokobanBoardComponent,
    SokobanLobbyComponent,
    GameRulesModalComponent,
    GameToolbarComponent,
  ],
  template: `
<div class="flex min-h-[calc(100dvh-64px)] lg:h-[calc(100dvh-64px)] w-full flex-col relative text-[var(--color-text-main)] select-none bg-[var(--color-bg-base)]">

  <!-- Rules Modal -->
  <app-game-rules-modal [gameId]="'sokoban'" [isOpen]="showRules()" (closed)="showRules.set(false)"></app-game-rules-modal>

  <!-- Tutorial Modal -->

  <!-- Top Full-Width Game Header (Shared for Lobby & Game) -->
  <div class="w-full max-w-[1600px] mx-auto pt-2 lg:pt-4 px-2 lg:px-6 z-40 sticky top-0 pb-2">
    <div class="w-full backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl lg:rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden" style="background-color: var(--color-bg-card);">
      <app-game-header
        [title]="i18n.t('lobby.sokoban')()"
        [subtitle]="showLobby() ? i18n.t('lobby.select_level')() : (getModeName() + ' - ' + getDifficultyName() + (store.currentRoomMode() === GameMode.Single ? (' - ' + i18n.t('game.level')() + ' ' + store.currentLevelNum()) : ''))"
        iconGradientClass="from-amber-400 to-orange-500"
        titleGradientClass="from-amber-300 to-orange-400"
        shadowClass="shadow-orange-500/20"
        headerBgClass="dark:bg-gradient-to-r dark:from-amber-900/30 dark:to-orange-900/30 px-4 lg:px-6 py-2 lg:py-3 mb-0"
        (back)="goBack()"
        (rules)="showRules.set(true)"
      >
        <div game-icon class="text-2xl sm:text-3xl md:text-4xl drop-shadow-md">📦</div>

        <ng-container header-right>
          <div class="flex items-center gap-1 sm:gap-2 lg:gap-4">
            @if (store.currentRoomMode() === GameMode.Single && !showLobby()) {
              <button (click)="showLobby.set(true)" 
                        class="px-2 lg:px-4 py-1 lg:py-1.5 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-xs lg:text-sm font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95">
                  <svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span class="hidden sm:inline">{{ i18n.t('game.levels_lobby')() }}</span>
                </button>
              }
              @if (settingsService.settings().multiplayer_enabled === 'true') {
                <button (click)="navigateToPkArena()" class="px-2 lg:px-4 py-1 lg:py-1.5 rounded-lg border border-[var(--color-border-card)] text-[var(--color-text-main)] hover:text-amber-500 hover:border-amber-500/50 hover:bg-[var(--color-bg-card)] transition-all shadow-sm flex items-center gap-1.5 active:scale-95 group text-xs lg:text-sm font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5 text-amber-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.pk_arena')() }}</span>
              </button>
              }
            </div>
          </ng-container>
      </app-game-header>

      @if (!showLobby()) {
        <!-- Progress Bar -->
        <div class="h-1.5 bg-[var(--color-border-card)] relative group overflow-hidden z-10 border-t border-[var(--color-border-card)]">
          <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            [style.width.%]="store.myProgress()">
          </div>
          <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span class="text-[10px] font-bold text-[var(--color-text-main)] bg-[var(--color-bg-card)] border border-[var(--color-border-card)] backdrop-blur-sm px-2 rounded-full absolute -top-6 whitespace-nowrap shadow-md z-20">
              {{ store.myCorrectCount() }} / {{ store.totalTargets() }}
            </span>
          </div>
        </div>
      }
    </div>
  </div>

  <div class="flex-grow min-h-0 w-full flex flex-col lg:flex-row p-2 lg:p-4 lg:px-6 gap-4 lg:gap-8 justify-center lg:items-stretch max-w-[1600px] mx-auto transition-colors duration-300">
    
    <!-- LEFT: SEO Description (Desktop only) -->
    <div class="hidden xl:flex w-[320px] xl:w-[400px] flex-shrink-0 flex-col gap-4 justify-start pt-2 overflow-y-auto custom-scrollbar min-h-0 pr-2">
      <div class="markdown-body text-[var(--color-text-secondary)] text-sm leading-relaxed text-left" 
           [innerHTML]="i18n.t('game.sokoban.seo_desc')()">
      </div>
    </div>

    <!-- CENTER: Game Arena -->
    <div class="flex-grow flex flex-col items-center relative min-w-0 min-h-0 max-w-[800px] w-full self-center lg:self-stretch">
      @if (showLobby()) {
        <app-sokoban-lobby class="flex-grow flex flex-col w-full h-full min-h-[600px]" (openLobby)="navigateToPkArena()" (levelSelect)="onLevelSelect($event)"></app-sokoban-lobby>
      } @else {
        <div class="w-full flex-grow flex flex-col backdrop-blur-xl border rounded-2xl lg:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300 overflow-hidden"
             style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
          <div class="flex-grow flex flex-col relative min-h-0 bg-[var(--color-bg-base)] w-full">



      @if (store.status() === GameStatus.Starting) {
        <app-game-starting-overlay [countdown]="gameTimer.countdownDisplay()"></app-game-starting-overlay>
      }

      @if (store.status() === GameStatus.Playing || store.status() === GameStatus.Finished || store.status() === GameStatus.Starting) {
        @if (store.currentRoomMode() === GameMode.Single) {
          <!-- Classic Style for Single Player -->
          <div class="flex-none py-1 mb-1 w-full shrink-0 relative z-10">
            <div class="w-full flex justify-center items-center px-4 gap-4 sm:gap-6">
              <div class="flex flex-col items-center bg-black/20 rounded-xl px-6 py-1 min-w-[100px]">
                <span class="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] font-bold">{{ i18n.t('game.moves')() || 'MOVES' }}</span>
                <span class="text-xl sm:text-2xl font-black text-amber-500 font-mono">{{ store.myMoves() }}</span>
              </div>
              <div class="flex flex-col items-center bg-black/20 rounded-xl px-6 py-1 min-w-[100px]">
                <span class="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] font-bold">{{ i18n.t('game.time')() || 'TIME' }}</span>
                <span class="text-xl sm:text-2xl font-black text-blue-400 font-mono">{{ gameTimer.formatTime(store.timeSpent()) }}</span>
              </div>
            </div>
          </div>
        } @else {
          <!-- PK Style -->
          <div class="flex-none py-1 border-b border-[var(--color-border-card)] w-full relative z-10 hidden lg:block">
            <div class="w-full max-w-[800px] mx-auto flex items-center gap-2 lg:gap-4 px-2 overflow-x-auto custom-scrollbar">

              <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
                [playerName]="playerId"
                [isHost]="store.hostId() === playerId"
                [isMe]="true"
                [stats]="[
                  { icon: '🦶', value: store.myMoves(), label: i18n.t('game.moves')() },
                  { icon: '⏱️', value: gameTimer.formatTime(store.timeSpent()), label: i18n.t('game.time')() }
                ]"
                [status]="store.myPlayerState()?.status || 'playing'"
              ></app-player-badge>

              @for (opp of store.opponents(); track opp.id) {
                <app-player-badge class="flex-1 min-w-[150px] lg:min-w-[200px] lg:max-w-[300px] shrink-0" layout="card"
                  [playerName]="opp.id"
                  [isHost]="opp.isHost"
                  [stats]="[
                    { icon: '🦶', value: opp.moves, label: i18n.t('game.moves')() }
                  ]"
                  [status]="opp.status"
                ></app-player-badge>
              }
            </div>
          </div>
        }

        <!-- Board Area: flex-grow + overflow-hidden，不产生滚动条 -->
        <div class="relative flex-grow flex flex-col lg:flex-row items-center justify-center min-h-0 overflow-hidden w-full py-2 px-2 z-10 gap-8">
          <div class="flex flex-col items-center justify-center shrink-0">
            <div class="relative flex items-center justify-center shrink-0"
               style="width: min(85vw, calc(100vh - 390px), 520px); height: min(85vw, calc(100vh - 390px), 520px);">
              <app-sokoban-board class="w-full h-full"></app-sokoban-board>
            </div>
          </div>

          @if (store.status() === GameStatus.Playing && store.isDead()) {
            <app-game-spectating-overlay
              [players]="spectatingPlayers()"
              [currentUserId]="playerId"
            ></app-game-spectating-overlay>
          }
        </div>

        <!-- Action Buttons Bar: flex-none，固定在卡片底部，始终可见 -->
           <app-game-toolbar
             [layoutStyle]="'compact'"
             [showBack]="true"
             [showPrev]="store.currentRoomMode() === GameMode.Single"
             [showUndo]="true"
             [showRestart]="true"
             [showHint]="store.currentRoomMode() === GameMode.Single"
             [showNext]="store.currentRoomMode() === GameMode.Single"
             [disablePrev]="store.currentLevelNum() <= 1"
             [disableNext]="!store.hasNextLevel()"
             hintLayout="sudoku"
             (back)="goBack()"
             (prevLevel)="store.prevLevel()"
             (undo)="store.undo()"
             (restart)="handleRestart()"
             (hintApplied)="applyHint()"
             (nextLevel)="store.nextLevel()"
             class="w-full"
           ></app-game-toolbar>
      }
        @if (store.status() === GameStatus.Finished && showOverlay()) {
          <app-game-result-overlay
            currentGameId="sokoban"
            [status]="getGameResult()"
            [title]="getGameResult() === 'win' ? i18n.t('game.you_win')() : i18n.t('game.you_lose')()"
            [stats]="[
              { label: i18n.t('game.moves')(), value: store.myMoves() },
              { label: i18n.t('game.time')(), value: gameTimer.formatTime(store.timeSpent()) }
            ]"
            [xpResult]="store.lastStatResult()?.xp_result"
            [isNewRecord]="store.lastStatResult()?.isNewRecord"
            [showNextLevel]="store.hasNextLevel() && store.currentRoomMode() === GameMode.Single"
            [showRestart]="store.currentRoomMode() === GameMode.Single || store.hostId() === playerId"
            [showLeave]="store.currentRoomMode() === GameMode.Single || store.hostId() !== playerId"
            [showDismiss]="store.currentRoomMode() !== GameMode.Single && store.hostId() === playerId"
            (nextLevel)="handleNextLevel()"
            (restart)="handleRestart()"
            (leave)="goBack()"
            (dismiss)="handleDismissRoom()"
          [enableChangeRoomGame]="store.currentRoomMode() !== GameMode.Single && store.hostId() === store.playerId()"
          (changeRoomGame)="store.changeRoomGame($event)">
          </app-game-result-overlay>
        }

        </div>
        </div>
      }
      
      <!-- BOTTOM: SEO Description (Mobile/Tablet only) -->
      <div class="block lg:hidden w-full mx-auto px-2 py-6 flex-none z-0">
        <div class="markdown-body text-[var(--color-text-secondary)] text-sm leading-relaxed text-left" 
             [innerHTML]="i18n.t('game.sokoban.seo_desc')()">
        </div>
      </div>
    </div>

    <!-- Mobile Sidebar Overlay Backdrop -->
    @if (isMobileSidebarOpen()) {
      <div class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm z-40 lg:hidden" 
           [class.lg:hidden]="!(store.status() === GameStatus.Playing && store.currentRoomMode() !== GameMode.Single)"
           (click)="isMobileSidebarOpen.set(false)"></div>
    }

    <!-- Right Sidebar (Lobby Panel) -->
    @if (settingsService.settings().multiplayer_enabled === 'true') {
      <div class="flex-shrink-0 transition-transform duration-300 self-stretch flex flex-col justify-center"
           [ngClass]="{
             'fixed inset-y-0 right-0 z-50 w-[85vw] sm:w-96 bg-[var(--color-bg-main)] shadow-2xl p-4': true,
             'translate-x-0': isMobileSidebarOpen(),
             'translate-x-full': !isMobileSidebarOpen(),
             'lg:relative lg:inset-auto lg:w-[320px] xl:w-[400px] lg:shadow-none lg:p-0 lg:z-20 lg:translate-x-0 lg:bg-transparent lg:flex': true}">
        <div class="flex justify-between items-center mb-4 lg:hidden">
          <h3 class="font-bold text-lg text-[var(--color-text-main)]">{{ i18n.t('game.room_info')() }}</h3>
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
    } @else {
      <!-- Empty Right Column for balance if Multiplayer disabled -->
      <div class="hidden lg:block w-[320px] xl:w-[400px] flex-shrink-0"></div>
    }
  </div>

  @if (store.status() === GameStatus.Waiting && store.currentRoomMode() !== GameMode.Single) {
    <div class="fixed top-[64px] inset-x-0 bottom-0 z-[100] flex flex-col bg-[var(--color-bg-main)]">
      <app-game-waiting-room class="w-full h-full flex"
        [gameId]="'sokoban'"
        [mode]="store.currentRoomMode()"
        [roomId]="store.roomId()"
        [difficulty]="store.currentDifficulty()"
        [players]="store.playersList()"
        [hostId]="store.hostId()"
        [currentUserId]="playerId"
        [readyPlayers]="store.readyPlayers()"
        (start)="store.startGame()"
        (leave)="goBack()"
        (changeSettings)="openChangeSettings()"
        (ready)="store.ready()"
        (cancelReady)="store.cancelReady()"
        (kick)="store.kickPlayer($event)"
        [target]="store.currentRoomTarget()"
      ></app-game-waiting-room>
    </div>
  }</div>
  `
})
export class SokobanComponent extends BaseGameComponent implements OnInit, OnDestroy {
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => []);
  adService = inject(AdService);
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  override store = inject(SokobanStore);
  private authStore = inject(AuthStore);
  private gameRegistry = inject(GameRegistryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dailyService = inject(DailyChallengeService);
  i18n = inject(I18nService);
  toastService = inject(ToastService);
  private pendingDailyChallengeId = signal<string | null>(null);
  private roomLifecycle!: RoomLifecycleHandle;

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;
  override isMobileSidebarOpen = signal(false);
  showLobby = signal(true);
  showRules = signal(false);
  showOverlay = signal(false);

  predefinedDifficulties = this.gameRegistry.getConfig('sokoban')?.difficulties || [];

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  constructor() {
    super();
    effect((onCleanup) => {
      if (this.store.status() === GameStatus.Finished) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });

    effect(() => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }
    });

    effect(() => {
      const result = this.store.lastStatResult();
      const challengeId = this.pendingDailyChallengeId();
      if (result && challengeId) {
        const t = this.store.timeSpent();
        this.dailyService.finish(0, t).subscribe();
        this.pendingDailyChallengeId.set(null);
      }
    });

    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'sokoban',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
  }

  override ngOnInit() {
    super.ngOnInit();

    const qp = this.route.snapshot.queryParamMap;
    const dailyChallengeId = qp.get('dailyChallengeId');
    const puzzleId = qp.get('puzzleId');
    const difficulty = qp.get('difficulty') ?? GameDifficulty.Easy;
    if (dailyChallengeId && puzzleId) {
      this.pendingDailyChallengeId.set(dailyChallengeId);
      this.store.joinRoomWithLevel(puzzleId, difficulty);
      this.showLobby.set(false);      return;
    }

    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '', pending.target ?? 1);
      if (pending.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
        this.showLobby.set(false);
      }
    } else {
      this.store.joinRoom('', GameMode.Single, GameDifficulty.Easy, this.playerId);
    }
  }

  override goBack() {
    if (this.showLobby()) {
      super.goBack();
    } else {
      if (this.store.currentRoomMode() === GameMode.Single) {
        this.showLobby.set(true);
      } else {
        super.goBack();
      }
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
    this.showLobby.set(false);  }
  changeDifficulty(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.changeSingleDifficulty(target.value);
    }
  }

  override openChangeSettings() {
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
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(this.store.roomId() || event.name, event.mode, event.difficulty, this.playerId);
      this.showLobby.set(false);
    }
  }

  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string; password?: string }) {
    super.handleJoinRoom(params);
    if (params.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
      this.showLobby.set(false);
    }
  }

  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  getGameResult(): 'win' | 'lose' {
    if (this.store.currentRoomMode() === GameMode.Single) return 'win';
    const raw = this.wsService.gameState();
    if (!raw || !raw.winners) return 'lose';
    return raw.winners.includes(this.playerId) ? 'win' : 'lose';
  }

  handleRestart() {
    if (this.store.currentRoomMode() === GameMode.Single) {
      this.store.restart();
    } else {
      this.store.restart();
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



  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }
}
