import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, effect, untracked, signal, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameDifficulty, GameMode, GameStatus, GameResult } from '../../../core/models/game.model';
import { ConnectStore } from './connect.store';
import { ConnectBoardComponent } from './components/connect-board.component';
import { ConnectLobbyComponent } from './components/connect-lobby.component';
import { EditRoomService } from '../../../core/services/edit-room.service';
import { ToastService } from '../../../core/services/toast.service';

import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameSpectatingOverlayComponent } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';

import { WebSocketService } from '../../../core/services/websocket.service';
import { AudioService } from '../../../core/services/audio.service';
import { DailyChallengeService } from '../../../core/services/daily-challenge.service';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { BaseGameComponent } from '../../../core/utils/base-game.component';

import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats, PkMetric } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [
    CommonModule,
    ConnectBoardComponent,
    ConnectLobbyComponent,
    GameResultOverlayComponent,
    GameSpectatingOverlayComponent,
    GameWaitingRoomComponent,
    GameLayoutComponent,
    GamePkHudComponent,
    GameToolbarComponent
  ],
  providers: [ConnectStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connect.component.html',
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
  toastService = inject(ToastService);
  editRoomService = inject(EditRoomService);
  private pendingDailyChallengeId = signal<string | null>(null);
  private roomLifecycle!: RoomLifecycleHandle;
  
  view = this.store.view;
  showOverlay = signal(false);  showRules = signal(false);
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;

  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    const isFinished = this.store.winners().includes(this.playerId);
    const prog = Math.round(this.store.myProgress());
    return {
      id: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: true,
      score: prog,
      progress: prog,
      status: isFinished ? GameStatus.Finished : (this.store.status() === GameStatus.Finished ? GameStatus.Finished : GameStatus.Playing),
      metrics: [
        { label: this.i18n.t('game.progress')() || '进度', value: `${prog}%`, icon: '🌟', colorClass: 'text-amber-500 font-bold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    return this.store.opponents().map(opp => {
      const prog = Math.round(opp.progress || 0);
      const isFinished = this.store.winners().includes(opp.id);
      return {
        id: opp.id,
        nickname: opp.id,
        isHost: opp.isHost,
        isMe: false,
        score: prog,
        progress: prog,
        status: isFinished ? GameStatus.Finished : (opp.finished ? GameStatus.Finished : GameStatus.Playing),
        metrics: [
          { label: this.i18n.t('game.progress')() || '进度', value: `${prog}%`, icon: '🌟', colorClass: 'text-amber-500 font-bold' }
        ]
      };
    });
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return undefined;
    const oppId = this.opponentsPkStats()[0]?.id;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.playerId] || 0,
      opponent: wins[oppId] || 0
    };
  });

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
    this.store.joinRoomWithLevel(levelId, this.store.currentDifficulty());
  }
  onBoardChange() {
    this.store.checkSolution();
  }

  onRestart() {
    this.store.restart();
  }

  onHintApplied() {
    this.store.applyHint();
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

  openChangeSettingsGlobal() {
    if (this.store.roomId()) {
      this.editRoomService.open({
        roomId: this.store.roomId(),
        gameId: 'connect',
        mode: this.store.currentRoomMode(),
        difficulty: this.store.currentDifficulty()
      });
    }
  }
}
