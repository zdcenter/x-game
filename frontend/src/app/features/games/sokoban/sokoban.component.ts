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
import { EditRoomService } from '../../../core/services/edit-room.service';
import { SokobanBoardComponent } from './components/board/sokoban-board.component';
import { SokobanLobbyComponent } from './components/sokoban-lobby/sokoban-lobby.component';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { DailyChallengeService } from '../../../core/services/daily-challenge.service';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats, PkMetric } from '../../../shared/components/game-pk-hud/game-pk-hud.model';

@Component({
  selector: 'app-sokoban',
  standalone: true,
  imports: [
    GameSpectatingOverlayComponent, 
    CommonModule,
    GameResultOverlayComponent,
    GameWaitingRoomComponent,
    GameStartingOverlayComponent,
    GameLobbyPanelComponent,
    SokobanBoardComponent,
    SokobanLobbyComponent,
    GameToolbarComponent,
    GameLayoutComponent,
    GamePkHudComponent
  ],
  templateUrl: './sokoban.component.html'
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
  editRoomService = inject(EditRoomService);
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

  myPlayerPkStats = computed<PkPlayerStats>(() => {
    const prog = Math.round(this.store.myProgress());
    const isFinished = this.store.myPlayerState()?.status === 'finished';
    return {
      id: this.playerId,
      nickname: this.playerId,
      isMe: true,
      isHost: this.store.hostId() === this.playerId,
      isFinished,
      progress: prog,
      metrics: [
        { icon: '🦶', label: this.i18n.t('game.moves')() || '步数', value: this.store.myMoves() },
        { icon: '⏱️', label: this.i18n.t('game.time')() || '用时', value: this.gameTimer.formatTime(this.store.timeSpent()) }
      ],
      status: isFinished ? 'finished' : 'playing'
    };
  });

  opponentsPkStats = computed<PkPlayerStats[]>(() => {
    return this.store.opponents().map(opp => {
      let targets = 0;
      let onTargets = 0;
      if (opp.board && opp.board.length > 0) {
        for (const row of opp.board) {
          for (const cell of row) {
            if (cell === '.' || cell === '+' || cell === '*') targets++;
            if (cell === '*') onTargets++;
          }
        }
      }
      const oppProg = targets > 0 ? Math.round((onTargets / targets) * 100) : 0;
      const isFinished = opp.status === 'finished' || oppProg === 100;

      return {
        id: opp.id,
        nickname: opp.id,
        isMe: false,
        isHost: opp.isHost,
        isFinished,
        progress: oppProg,
        metrics: [
          { icon: '🦶', label: this.i18n.t('game.moves')() || '步数', value: opp.moves }
        ],
        status: isFinished ? 'finished' : 'playing'
      };
    });
  });

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

  openChangeSettingsGlobal() {
    if (this.store.roomId()) {
      this.editRoomService.open({
        roomId: this.store.roomId(),
        gameId: 'sokoban',
        mode: this.store.currentRoomMode(),
        difficulty: this.store.currentDifficulty()
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
