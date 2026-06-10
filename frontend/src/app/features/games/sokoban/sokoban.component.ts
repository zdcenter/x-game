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
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { SokobanBoardComponent } from './components/board/sokoban-board.component';
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
    GameWaitingRoomComponent,
    GameStartingOverlayComponent,
    GameLobbyPanelComponent,
    SokobanBoardComponent,
    GameRulesModalComponent
  ],
  template: `
<div class="flex-grow flex flex-col lg:flex-row h-[calc(100vh-64px)] p-1 lg:p-4 gap-2 lg:gap-6 transition-colors duration-300 bg-[var(--color-bg-base)] text-[var(--color-text-main)] overflow-y-auto lg:overflow-hidden select-none overscroll-none">
    <div class="flex-grow flex flex-col items-center relative min-w-0 min-h-[600px] lg:min-h-0">
      <div class="w-full h-full flex flex-col overflow-hidden backdrop-blur-xl border rounded-2xl lg:rounded-3xl p-3 lg:p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300"
           style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        <app-game-header
        [title]="i18n.t('lobby.sokoban')()"
        [subtitle]="getModeName() + ' - ' + getDifficultyName()"
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
              <div class="flex flex-col items-center relative">
                <span class="text-[8px] lg:text-[10px] font-bold opacity-70 mb-0.5 lg:mb-1 uppercase tracking-widest">{{ i18n.t('game.difficulty')() }}</span>
                <select [value]="store.currentDifficulty()" (change)="changeDifficulty($event)"
                  class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-md lg:rounded-lg px-1 py-0.5 lg:px-3 lg:py-1.5 text-xs lg:text-base font-bold cursor-pointer outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner text-[var(--color-text-main)]">
                  @for (diff of predefinedDifficulties; track diff.id) {
                    <option [value]="diff.id">{{ i18n.t($any(diff.labelKey))() }}</option>
                  }
                </select>
              </div>
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
               style="width: min(95vw, calc(100vh - 220px), 600px); height: min(95vw, calc(100vh - 220px), 600px);">
            <app-sokoban-board class="w-full h-full"></app-sokoban-board>

            <!-- Floating Action Buttons -->
            <div class="absolute bottom-1 lg:bottom-4 left-1 lg:left-4 z-20">
              <button class="px-4 lg:px-6 py-2 lg:py-2 rounded-lg font-bold text-white shadow-lg transition-all bg-slate-700/80 hover:bg-slate-600 backdrop-blur-sm active:scale-95 text-sm lg:text-base border border-slate-600/50"
                      (click)="store.undo()">
                {{ i18n.t('game.undo')() }}
              </button>
            </div>
            <div class="absolute bottom-1 lg:bottom-4 right-1 lg:right-4 z-20">
              <button class="px-4 lg:px-6 py-2 lg:py-2 rounded-lg font-bold text-white shadow-lg transition-all bg-red-600/80 hover:bg-red-500 backdrop-blur-sm active:scale-95 text-sm lg:text-base border border-red-500/50"
                      (click)="store.restart()">
                {{ i18n.t('game.restart')() }}
              </button>
            </div>

            @if (store.status() === 'finished') {
              <app-game-result-overlay
                currentGameId="sokoban"
                [status]="getGameResult()"
                [title]="getGameResult() === 'win' ? i18n.t('game.you_win')() : i18n.t('game.you_lose')()"
                [showRestart]="store.currentRoomMode() === 'single' || store.hostId() === playerId"
                [showLeave]="store.currentRoomMode() === 'single' || store.hostId() !== playerId"
                [showDismiss]="store.currentRoomMode() !== 'single' && store.hostId() === playerId"
                (restart)="handleRestart()"
                (leave)="onLeaveClick()"
                (dismiss)="handleDismissRoom()"
                class="absolute inset-0 z-30 rounded-xl lg:rounded-2xl overflow-hidden backdrop-blur-md">
              </app-game-result-overlay>
            }
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
    </div>

    <div class="hidden lg:flex w-[400px] flex-col shrink-0 transition-all duration-300 relative z-20"
         [class.!hidden]="store.status() === 'playing' && store.currentRoomMode() !== 'single' && !isMobileSidebarOpen()">
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
  
  private roomLifecycle!: RoomLifecycleHandle;

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

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
      this.store.joinGame(pendingCross.roomId, this.playerId, pendingCross.mode, pendingCross.difficulty, pendingCross.host);
      if (pendingCross.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(pendingCross.roomId, pendingCross.mode, pendingCross.difficulty, pendingCross.host);
      }
      return;
    }

    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinGame(pending.roomId, this.playerId, pending.mode, pending.difficulty, pending.host || '');
      if (pending.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      this.store.joinGame('', this.playerId, 'single', 'easy', this.playerId);
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

  onLeaveClick() {
    this.store.leaveGame();
    this.router.navigate(['/lobby']);
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveGame();
  }
}
