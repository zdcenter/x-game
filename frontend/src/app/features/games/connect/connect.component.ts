import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, effect, untracked, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameDifficulty, GameMode, GameStatus, GameResult } from '../../../core/models/game.model';
import { ConnectStore } from './connect.store';
import { ConnectBoardComponent } from './components/connect-board.component';
import { ConnectLobbyComponent } from './components/connect-lobby.component';

import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { TutorialOverlayComponent } from '../../../shared/components/tutorial-overlay/tutorial-overlay.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameSpectatingOverlayComponent } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';

import { WebSocketService } from '../../../core/services/websocket.service';
import { AudioService } from '../../../core/services/audio.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { DailyChallengeService } from '../../../core/services/daily-challenge.service';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { BaseGameComponent } from '../../../core/utils/base-game.component';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [
    CommonModule,
    ConnectBoardComponent,
    ConnectLobbyComponent,
    GameResultOverlayComponent,
    GameLobbyPanelComponent,
    GameHeaderComponent,
    PlayerBadgeComponent,
    TutorialOverlayComponent,
    GameRulesModalComponent,
    GameSpectatingOverlayComponent,
    GameWaitingRoomComponent
  ],
  providers: [ConnectStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  
  template: `
<div class="flex min-h-[calc(100dvh-64px)] lg:h-[calc(100dvh-64px)] w-full flex-col relative text-[var(--color-text-main)] select-none bg-[var(--color-bg-base)]">
  <!-- Rules Modal -->
  <app-game-rules-modal [gameId]="'connect'" [isOpen]="showRules()" (closed)="showRules.set(false)"></app-game-rules-modal>

  <!-- Tutorial Modal -->
  <app-tutorial-overlay *ngIf="showTutorial()" [steps]="tutorialSteps" (done)="onTutorialDone()"></app-tutorial-overlay>

  <!-- Top Full-Width Game Header -->
  <div class="w-full max-w-[1600px] mx-auto pt-2 lg:pt-4 px-2 lg:px-6 z-40 sticky top-0 pb-2">
    <div class="w-full backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl lg:rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden" style="background-color: var(--color-bg-card);">
      <app-game-header
        [title]="i18n.t('lobby.connect')()"
        [subtitle]="getSubtitle()"
        iconGradientClass="from-cyan-500 to-blue-500"
        titleGradientClass="from-cyan-400 to-blue-400"
        shadowClass="shadow-cyan-500/20"
        headerBgClass="dark:bg-gradient-to-r dark:from-cyan-900/30 dark:to-blue-900/30 px-4 lg:px-6 py-2 lg:py-3 mb-0"
        (back)="goBack()"
        (rules)="showRules.set(true)"
      >
        <div game-icon class="text-2xl sm:text-3xl md:text-4xl drop-shadow-md">🔗</div>

        <ng-container header-right>
          <div class="flex items-center gap-1 sm:gap-2 lg:gap-4">
            <button (click)="navigateToPkArena()" class="px-2 lg:px-4 py-1 lg:py-1.5 rounded-lg border border-[var(--color-border-card)] text-[var(--color-text-main)] hover:text-amber-500 hover:border-amber-500/50 hover:bg-[var(--color-bg-card)] transition-all shadow-sm flex items-center gap-1.5 active:scale-95 group text-xs lg:text-sm font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 lg:h-5 lg:w-5 text-amber-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="hidden sm:inline">{{ i18n.t('game.pk_arena')() }}</span>
              </button>
          </div>
        </ng-container>
      </app-game-header>

      <!-- Progress Bar (Optional) -->
      <div *ngIf="view() === 'play' && store.currentRoomMode() === GameMode.Single" class="h-1.5 bg-[var(--color-border-card)] relative group overflow-hidden border-t border-[var(--color-border-card)]">
        <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-300" 
             [style.width.%]="store.myProgress()">
        </div>
      </div>
    </div>
  </div>

  <div class="flex-grow min-h-0 w-full flex flex-col lg:flex-row p-2 lg:p-4 lg:px-6 gap-4 lg:gap-8 justify-center lg:items-stretch max-w-[1600px] mx-auto transition-colors duration-300">
    
    <!-- LEFT: SEO Description (Desktop only) -->
    <div class="hidden xl:flex w-[320px] xl:w-[400px] flex-shrink-0 flex-col gap-4 justify-start pt-2">
      <div class="markdown-body text-[var(--color-text-secondary)] text-sm leading-relaxed text-left">
         <h2>关于数字连线 (Number Connect)</h2>
         <p>数字连线是一款经典的益智游戏。在网格中，将相同数字的端点用线条连接起来，并填满所有可用的空白格子。</p>
         <h3>游戏规则</h3>
         <ul>
           <li>线条不能交叉，且不能穿过障碍块（墙壁）。</li>
           <li>必须把所有相同的数字两两配对连接。</li>
           <li>必须填满整个网格中除障碍块以外的所有空白格子才能过关。</li>
         </ul>
      </div>
    </div>

    <!-- CENTER: Game Arena -->
    <div class="flex-grow flex flex-col items-center relative min-w-0 min-h-0 max-w-[800px] w-full self-center lg:self-stretch">
      <ng-container *ngIf="view() === 'lobby'">
        <app-connect-lobby class="flex-grow flex flex-col w-full h-full min-h-[600px] backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl lg:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden" style="background-color: var(--color-bg-card);"
          (startLevel)="startLevel($event)">
        </app-connect-lobby>
      </ng-container>

      <ng-container *ngIf="view() === 'play'">
        <div class="w-full flex-grow flex flex-col backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl lg:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300 overflow-hidden"
             style="background-color: var(--color-bg-card);">
             
             <!-- Play Area Content -->
             <div class="flex-1 flex flex-col items-center justify-center p-4 relative">
                
                <!-- NEW INFO BAR -->
                <div *ngIf="store.currentRoomMode() === GameMode.Single" class="w-full max-w-xl mx-auto flex justify-between items-center px-4 py-2 bg-slate-800/50 rounded-lg mb-4 text-sm sm:text-base border border-slate-700/50">
                   <div class="text-slate-300 font-bold flex items-center gap-2">
                      <span class="text-[var(--color-accent-from)] uppercase">{{ i18n.t('game.diff_' + store.currentDifficulty())() }}</span>
                      <span class="text-slate-500">|</span>
                      <span>第 {{ store.currentLevelNum() }} 关</span>
                   </div>
                   <div class="text-slate-300 font-mono flex items-center gap-4">
                      <span>⏱️ {{ formatTime(store.timeSpent()) }}</span>
                   </div>
                </div>
                
                <app-game-waiting-room
                  class="absolute inset-0 z-30 w-full h-full flex bg-slate-900/80 backdrop-blur-sm"
                  *ngIf="store.status() === GameStatus.Waiting"
                  [gameId]="'connect'"
                  [mode]="store.currentRoomMode()"
                  [roomId]="store.roomId()"
                  [difficulty]="store.currentDifficulty() || GameDifficulty.Medium"
                  [players]="getPlayers()"
                  [hostId]="store.hostId()"
                  [currentUserId]="store.playerId()"
                  [readyPlayers]="$any(store.rawState())?.readyPlayers || {}"
                  (leave)="store.leaveRoom(); goBackToLobby()"
                  (start)="store.startGame()"
                  (changeSettings)="openChangeSettings()"
                  (kick)="store.kickPlayer($event)"
                  (ready)="store.ready()"
                  (cancelReady)="store.cancelReady()"
                  [target]="store.currentRoomTarget()"
                ></app-game-waiting-room>

                <div *ngIf="store.status() === GameStatus.Starting" class="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md z-40">
                  <div class="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 animate-pulse drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                    {{ gameTimer.countdownDisplay() }}
                  </div>
                </div>

                <!-- Opponents PK Stats overlay (top area) -->
                <div *ngIf="store.currentRoomMode() !== GameMode.Single" class="w-full flex justify-center gap-4 mb-4">
                   <app-player-badge 
                      *ngFor="let opp of store.opponents()"
                      [playerName]="opp.id"
                      [isMe]="false"
                      [isHost]="opp.isHost"
                      [stats]="[{ icon: '🌟', value: (opp.progress | number:'1.0-0') + '%' }]"
                      [status]="opp.finished ? GameStatus.Finished : GameStatus.Playing">
                   </app-player-badge>
                </div>

                <div class="w-full max-w-xl mx-auto flex items-center justify-center">
                  <app-connect-board 
                    *ngIf="store.localEngine()"
                    [engine]="store.localEngine()!"
                    [disabled]="store.status() !== GameStatus.Playing"
                    (boardChange)="onBoardChange()">
                  </app-connect-board>
                </div>

                <div *ngIf="store.currentRoomMode() === GameMode.Single" class="w-full max-w-xl flex justify-between items-center mt-6 px-2">
                  <button (click)="store.prevLevel()" 
                          [disabled]="store.currentLevelNum() <= 1"
                          class="px-6 py-3 rounded-full font-bold transition-all flex items-center"
                          [ngClass]="store.currentLevelNum() <= 1 ? 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] cursor-not-allowed' : 'bg-[var(--color-bg-main)] text-[var(--color-text-main)] hover:brightness-110 border border-[var(--color-border-card)] shadow-md'">
                    <span class="mr-2">←</span> {{ i18n.t('game.prev_level')() }}
                  </button>
                  <button (click)="store.nextLevel()" 
                          [disabled]="!store.hasNextLevel()"
                          class="px-6 py-3 rounded-full font-bold transition-all flex items-center"
                          [ngClass]="!store.hasNextLevel() ? 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] cursor-not-allowed' : 'bg-[var(--color-bg-main)] text-[var(--color-text-main)] hover:brightness-110 border border-[var(--color-border-card)] shadow-md'">
                    {{ i18n.t('game.next_level')() }} <span class="ml-2">→</span>
                  </button>
                </div>
             </div>
        </div>
      </ng-container>
    </div>

    <!-- RIGHT: Lobby Panel (Desktop only) -->
    <div class="hidden lg:flex w-[320px] flex-shrink-0 flex-col gap-4 justify-start self-start pt-2 sticky top-[100px]">
      <app-game-lobby-panel 
        [currentGameId]="'connect'"
        [currentRoomId]="store.roomId()"
        (joinRoom)="handleJoinRoom($event)"
        (createRoom)="handleCreateRoom($event)">
      </app-game-lobby-panel>
    </div>

    <!-- Right Sidebar Drawer (Mobile) -->
    <div class="fixed inset-0 z-50 lg:hidden pointer-events-none" [class.pointer-events-auto]="isMobileSidebarOpen()">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
           [class.opacity-100]="isMobileSidebarOpen()"
           [class.opacity-0]="!isMobileSidebarOpen()"
           (click)="isMobileSidebarOpen.set(false)"></div>
      <div class="absolute right-0 top-0 bottom-0 w-[320px] max-w-[85vw] bg-[var(--color-bg-card)] shadow-2xl transition-transform duration-300 ease-out border-l border-[var(--color-border-card)]"
           [class.translate-x-0]="isMobileSidebarOpen()"
           [class.translate-x-full]="!isMobileSidebarOpen()">
        <app-game-lobby-panel
          [currentGameId]="'connect'"
          [currentRoomId]="store.roomId()"
          (joinRoom)="handleJoinRoom($event)"
          (createRoom)="handleCreateRoom($event)">
        </app-game-lobby-panel>
      </div>
    </div>
  </div>

  <!-- Result Overlay -->
  <app-game-result-overlay
    *ngIf="showOverlay()"
    [currentGameId]="'connect'"
    [status]="store.winners().includes(playerId) ? GameResult.Win : GameResult.Lose"
    [title]="store.winners().includes(playerId) ? 'Victory' : 'Defeat'"
    [stats]="getSinglePlayerStats()"
    [showNextLevel]="store.currentRoomMode() === GameMode.Single"
    [showRestart]="true"
    [showLeave]="true"
    [isNewRecord]="store.lastStatResult()?.isNewRecord"
    [xpResult]="store.lastStatResult()?.xp_result"
    (nextLevel)="onOverlayClose()"
    (restart)="store.restart(); showOverlay.set(false)"
    (leave)="goBackToLobby(); showOverlay.set(false)">
  </app-game-result-overlay>

  <app-game-spectating-overlay 
    *ngIf="store.isSpectator()"
    [players]="store.opponents()">
  </app-game-spectating-overlay>
</div>
  `,
styles: [`
    .btn-icon {
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }
  `]
})
export class ConnectComponent extends BaseGameComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  GameResult = GameResult;
  
  store = inject(ConnectStore);
  router = inject(Router);
  http = inject(HttpClient);
  i18n = inject(I18nService);
  authStore = inject(AuthStore);
  private roomLifecycle!: RoomLifecycleHandle;
  private tutorialService = inject(TutorialService);

  view = this.store.view;
  showOverlay = signal(false);
  showTutorial = signal(false);
  showRules = signal(false);
  tutorialSteps = this.tutorialService.getStepsForGame('connect');

  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;

  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  getPlayers(): any[] {
    const raw = this.store.rawState() as any;
    if (!raw || !raw.players) return [];
    return Object.values(raw.players);
  }

  constructor() {
    super();

    effect((onCleanup) => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        untracked(() => this.gameTimer.startCountdown());
      }
      
      const isFin = this.store.isFinished() || status === GameStatus.Finished;
      if (isFin) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });

    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'connect',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    this.view.set('lobby');

    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      if (joinInfo.password) this.wsService.setPendingPassword(joinInfo.password);
      this.store.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '', joinInfo.target ?? 1);
      if (joinInfo.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '');
      }
    }
  }

  getSinglePlayerStats() {
    return [
      { icon: '⏱️', value: this.gameTimer.formatTime(this.store.timeSpent()) }
    ];
  }

  override handleJoinRoom(event: { roomId: string, mode: string, difficulty: string, host: string, password?: string }) {
    if (this.store.roomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(event.roomId, event.mode, event.difficulty, event.host);
    }
    this.isMobileSidebarOpen.set(false);
    this.view.set('play');
  }

  override handleCreateRoom(event: { name: string, mode: string, difficulty: string, password?: string }) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(event.name, event.mode, event.difficulty, this.playerId);
    }
    this.isMobileSidebarOpen.set(false);
    this.view.set('play');
  }

  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  override ngOnDestroy() {
    this.wsService.disconnect('connect');
    this.gameTimer.stopCountdown();
  }

  goBackToLobby() {
    this.store.view.set('lobby');
  }

  getSubtitle(): string {
    const v = this.view();
    if (v === 'lobby') {
      return this.i18n.t('lobby.select_level')();
    } else if (v === 'play' && this.store.currentRoomMode() === GameMode.Single) {
      return this.i18n.t('game.single_label')() + ' - Lv.' + this.store.currentLevelNum();
    } else {
      return this.i18n.t('game.same_pk_speed_label')();
    }
  }

  override goBack(): void {
    if (this.view() === 'lobby') {
      if (this.store.currentRoomMode() === GameMode.Single) {
        this.store.leaveRoom();
        super.navigateToLobby();
      } else {
        super.goBack();
      }
    } else if (this.view() === 'play' && this.store.currentRoomMode() === GameMode.Single) {
      this.goBackToLobby();
    } else {
      if (this.store.roomId()) {
        if (this.store.hostId() === this.playerId) {
          this.baseToastService.confirm({
            title: this.i18n.t('game.dismiss_title')(),
            message: this.i18n.t('game.dismiss_msg')(),
            confirmText: this.i18n.t('game.dismiss_confirm')(),
            cancelText: this.i18n.t('game.cancel')(),
            onConfirm: () => {
              this.store.dismissRoom();
              this.baseToastService.show(this.i18n.t('game.dismiss_success')(), 'success');
              this.goBackToLobby();
            }
          });
          return;
        } else {
          this.store.leaveRoom();
        }
      }
      this.goBackToLobby();
    }
  }

  startLevel(levelId: string) {
    this.view.set('play');
    this.store.loadLevel(levelId);
    if (!this.tutorialService.hasSeen('connect') && this.tutorialSteps.length) {
      setTimeout(() => this.showTutorial.set(true), 500);
    }
  }

  onTutorialDone(): void {
    this.tutorialService.markSeen('connect');
    this.showTutorial.set(false);
  }

  onBoardChange() {
    this.store.checkSolution();
  }

  onOverlayClose() {
    this.showOverlay.set(false);
    if (this.store.currentRoomMode() === GameMode.Single) {
      if (this.store.hasNextLevel()) {
        this.store.nextLevel();
      } else {
        this.goBackToLobby();
      }
    }
  }

  formatTime(seconds: number): string {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  override openChangeSettings() {
    if (this.lobbyPanel && this.store.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.store.roomId(),
        game: 'connect',
        mode: this.store.currentRoomMode(),
        difficulty: '',
        host: this.store.hostId()
      });
    }
  }
}
