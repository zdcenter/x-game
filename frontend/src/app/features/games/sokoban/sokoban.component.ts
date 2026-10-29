import { Component, inject, OnInit, OnDestroy, ViewChild, signal, effect, computed } from '@angular/core';
import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { AdService } from '../../../core/services/ad.service';
import { GameDifficulty, GameId, GameMode, GameStatus } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { SokobanStore } from './store/sokoban.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { ToastService } from '../../../core/services/toast.service';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { EditRoomService } from '../../../core/services/edit-room.service';
import { SokobanBoardComponent } from './components/board/sokoban-board.component';
import { SokobanLobbyComponent } from './components/sokoban-lobby/sokoban-lobby.component';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { DailyChallengeService } from '../../../core/services/daily-challenge.service';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats, PkMetric } from '../../../shared/components/game-pk-hud/game-pk-hud.model';

import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';

@Component({
  selector: 'app-sokoban',
  standalone: true,
  imports: [
    GameSpectatingOverlayComponent, 
    CommonModule,
    SokobanBoardComponent,
    SokobanLobbyComponent,
    GameToolbarComponent,
    GameLayoutComponent,
    GamePkHudComponent,
    GameHandheldHeaderComponent
  ],
  templateUrl: './sokoban.component.html'
})
export class SokobanComponent extends BaseGameComponent implements OnInit, OnDestroy {
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => []);
  override store = inject(SokobanStore);
  private route = inject(ActivatedRoute);
  private dailyService = inject(DailyChallengeService);
  editRoomService = inject(EditRoomService);
  private pendingDailyChallengeId = signal<string | null>(null);
  private roomLifecycle!: RoomLifecycleHandle;

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;
  showLobby = signal(true);

  private windowSize = inject(WindowSizeService);

  readonly boardDimPx = computed(() => {
    const { w: vw, h: vh } = this.windowSize.size();
    const board = this.store.myBoard();
    const rows = board?.length || 8;
    const cols = board?.[0]?.length || 8;
    const maxGrid = Math.max(rows, cols);
    const isPk = this.store.currentRoomMode() !== GameMode.Single;

    const chromeH = isPk
      ? (vw < 640 ? 250 : vw < 1024 ? 270 : 290)
      : (vw < 640 ? 190 : vw < 1024 ? 210 : 230);
    const availH = Math.max(260, vh - chromeH);

    const padW = vw < 640 ? 24 : vw < 1024 ? 48 : 64;
    const availW = Math.max(260, Math.min(vw - padW, 1400));

    // Dynamic max board dimension:
    // Mobile: up to 440px
    // Tablet (iPad): up to 720px (allows sokoban warehouse to be large and clear)
    // Desktop: up to 760px
    const maxDim = vw < 640 ? 440 : (vw < 1024 ? 720 : 760);

    const dim = Math.max(260, Math.floor(Math.min(availW, availH, maxDim)));
    return `${dim}px`;
  });

  predefinedDifficulties = this.gameRegistry.getConfig('sokoban')?.difficulties || [];

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

  constructor() {
    super();
    effect(() => {
      if (this.store.status() === GameStatus.Finished) {
        if (this.store.isVictory()) {
          this.celebrateVictory();
        }
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
      if (pending.isSpectator) this.wsService.setPendingAction('spectate');
      this.store.joinRoom(
        pending.roomId,
        pending.mode,
        pending.difficulty,
        pending.host || '',
        pending.target ?? 1,
        pending.password || '',
        pending.bountyCoins ?? 0,
        pending.isSpectator || false
      );
      if (pending.mode !== GameMode.Single && !pending.isSpectator) {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
      this.showLobby.set(false);
    } else {
      const savedDiff = getSavedDifficulty('sokoban', GameDifficulty.Easy);
      this.store.joinRoom('', GameMode.Single, savedDiff, this.playerId);
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

  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string; password?: string; bountyCoins?: number; isSpectator?: boolean }) {
    super.handleJoinRoom(params);
    if (params.mode !== GameMode.Single && !params.isSpectator) {
      this.roomLifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
    this.showLobby.set(false);
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

  override handleRestart() {
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
