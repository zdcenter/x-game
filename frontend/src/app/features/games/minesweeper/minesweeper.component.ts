import { GameDifficulty, GameId, GameMode, GameResult, GameResultType, GameStatus } from '../../../core/models/game.model';
import { storageGet, storageSet, getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, NgZone, Renderer2, inject, effect, signal, computed, untracked, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { MinesweeperStore, CellState } from './store/minesweeper.store';
import { C2SAction } from '../../../core/models/websocket.model';
import { CellComponent } from './components/cell/cell.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AudioService } from '../../../core/services/audio.service';
import { ToastService } from '../../../core/services/toast.service';
import { DeviceService } from '../../../core/services/device.service';
import { CoinService } from '../../../core/services/coin.service';
import { CoinGuideService } from '../../../core/services/coin-guide.service';
import { ZenModeService } from '../../../core/services/zen-mode.service';
import { PwaService } from '../../../core/services/pwa.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { CoinIconComponent } from '../../../shared/components/coin-icon/coin-icon.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameFrozenOverlayComponent } from '../../../shared/components/game-frozen-overlay/game-frozen-overlay.component';
import { GamePkModeBadgeComponent } from '../../../shared/components/game-pk-mode-badge/game-pk-mode-badge.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { FormsModule } from '@angular/forms';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';


import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';

@Component({
  selector: 'app-minesweeper',
  standalone: true,
  imports: [CommonModule, FormsModule, CellComponent, GameToolbarComponent, GameFrozenOverlayComponent, GameLayoutComponent, GamePkHudComponent, GameHandheldHeaderComponent],
  providers: [MinesweeperStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './minesweeper.component.html',
  styleUrl: './minesweeper.component.css'
})
export class MinesweeperComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(MinesweeperStore);
  coinService = inject(CoinService);
  coinGuideService = inject(CoinGuideService);
  zenService = inject(ZenModeService);
  pwaService = inject(PwaService);
  feedbackService = inject(FeedbackService);
  private elementRef = inject(ElementRef);

  private roomLifecycle!: RoomLifecycleHandle;
  currentRoomMode = signal<string>(GameMode.Single);
  currentRoomId = signal<string>('');
  currentDifficulty = signal<string>('medium');
  frozenRemaining = signal(0);
  mobileActionMode = signal<'reveal' | 'flag'>('reveal');

  // Dynamic cell sizing & smooth zoom
  cellSize = signal<number>(34);
  readonly minCellSize = 22;
  readonly maxCellSize = 52;
  readonly defaultCellSize = 34;

  zoomIn() {
    this.cellSize.update(size => Math.min(this.maxCellSize, size + 4));
  }

  zoomOut() {
    this.cellSize.update(size => Math.max(this.minCellSize, size - 4));
  }

  resetZoom() {
    this.cellSize.set(this.defaultCellSize);
  }

  // Two-finger pinch-to-zoom tracking
  private initialPinchDistance = 0;
  private initialPinchCellSize = 34;

  onContainerTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      this.initialPinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      this.initialPinchCellSize = this.cellSize();
    }
  }

  onContainerTouchMove(event: TouchEvent) {
    if (event.touches.length === 2 && this.initialPinchDistance > 0) {
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = dist / this.initialPinchDistance;
      const targetSize = Math.round(this.initialPinchCellSize * scale);
      const clampedSize = Math.max(this.minCellSize, Math.min(this.maxCellSize, targetSize));
      if (clampedSize !== this.cellSize()) {
        this.cellSize.set(clampedSize);
      }
      if (event.cancelable) {
        event.preventDefault();
      }
    }
  }

  onContainerTouchEnd(event: TouchEvent) {
    if (event.touches.length < 2) {
      this.initialPinchDistance = 0;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Quick restart with R in single-player mode
    if ((event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey) {
      if (this.currentRoomMode() === GameMode.Single) {
        this.changeSingleDifficulty(this.currentDifficulty());
        event.preventDefault();
        return;
      }
    }
    // Space or F key to toggle action mode between reveal and flag
    if (event.key === ' ' || event.key === 'f' || event.key === 'F') {
      this.mobileActionMode.update(m => m === 'reveal' ? 'flag' : 'reveal');
      event.preventDefault();
    }
  }
  
  showCustomDialog = signal(false);
  customW = signal(16);
  customH = signal(16);
  customM = signal(40);
  
  get predefinedDifficulties() {
    return this.gameRegistry.getConfig('minesweeper')?.difficulties || [];
  }

  hasLostSingleMode = computed(() => this.currentRoomMode() === GameMode.Single && this.store.board().some(row => row.some(c => c.state === 3)));

  isDefeat = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.hasLostSingleMode();
    if (this.currentRoomMode() === GameMode.Speed) return !this.hasWonSpeedMode();
    if (this.currentRoomMode() === GameMode.Steal) {
      const rawScores = this.store.scores();
      const myScore = rawScores[this.playerId] || 0;
      const otherScores = Object.keys(rawScores).filter(id => id !== this.playerId).map(id => rawScores[id]);
      const maxOtherScore = otherScores.length > 0 ? Math.max(...otherScores) : 0;
      return myScore < maxOtherScore;
    }
    return false;
  });

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    const isSteal = this.currentRoomMode() === GameMode.Steal;
    const myScore = this.store.scores()[this.playerId] || 0;
    const metrics = isSteal 
      ? [
          { label: this.i18n.t('game.pk.score')(), value: myScore, icon: '⭐', colorClass: 'text-amber-500 font-bold' },
          ...(this.store.myErrors() > 0 ? [{ label: this.i18n.t('game.pk.errors')(), value: this.store.myErrors(), icon: '❌', colorClass: 'text-red-500 font-semibold' }] : [])
        ]
      : [
          { label: this.i18n.t('game.pk.mines')(), value: this.store.remainingMines(), icon: '💣', colorClass: 'text-rose-500 font-semibold' },
          ...(this.store.myErrors() > 0 ? [{ label: this.i18n.t('game.pk.errors')(), value: this.store.myErrors(), icon: '❌', colorClass: 'text-red-500 font-semibold' }] : [])
        ];

    return {
      id: this.playerId,
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.host(),
      isMe: true,
      progress: isSteal ? undefined : this.store.myProgress(),
      score: isSteal ? myScore : undefined,
      status: this.store.status(),
      metrics
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) return [];
    const isSteal = this.currentRoomMode() === GameMode.Steal;
    const room = this.store.room();
    const rawPlayers = room?.players;
    const players: any[] = Array.isArray(rawPlayers)
      ? rawPlayers
      : (rawPlayers && typeof rawPlayers === 'object' ? Object.values(rawPlayers) : []);

    if (isSteal) {
      const scores = this.store.scores();
      const oppId = Object.keys(scores).find(id => id !== this.playerId);
      if (!oppId) {
        const otherPlayer = players.find((p: any) => p.id !== this.playerId);
        if (!otherPlayer) return [];
        return [{
          id: otherPlayer.id,
          playerId: otherPlayer.id,
          nickname: otherPlayer.nickname || otherPlayer.id,
          avatar: otherPlayer.avatar,
          isHost: otherPlayer.id === this.store.host(),
          isMe: false,
          score: 0,
          status: this.store.status(),
          metrics: [{ label: this.i18n.t('game.pk.score')(), value: 0, icon: '⭐', colorClass: 'text-amber-500 font-bold' }]
        }];
      }
      const otherInfo = players.find((p: any) => p.id === oppId);
      const oppScore = scores[oppId] || 0;
      return [{
        id: oppId,
        playerId: oppId,
        nickname: otherInfo?.nickname || oppId,
        avatar: otherInfo?.avatar,
        isHost: oppId === this.store.host(),
        isMe: false,
        score: oppScore,
        status: this.store.status(),
        metrics: [
          { label: this.i18n.t('game.pk.score')(), value: oppScore, icon: '⭐', colorClass: 'text-amber-500 font-bold' },
          ...(this.store.opponentErrors() > 0 ? [{ label: this.i18n.t('game.pk.errors')(), value: this.store.opponentErrors(), icon: '❌', colorClass: 'text-red-500 font-semibold' }] : [])
        ]
      }];
    }

    // Speed mode
    return this.store.speedOpponents().map((opp: any) => {
      const pInfo = players.find((p: any) => p.id === opp.id);
      return {
        id: opp.id,
        playerId: opp.id,
        nickname: pInfo?.nickname || opp.id,
        avatar: pInfo?.avatar,
        isHost: opp.id === this.store.host(),
        isMe: false,
        progress: opp.progress,
        status: opp.progress >= 100 ? GameStatus.Finished : this.store.status(),
        metrics: [
          ...(opp.errors > 0 ? [{ label: this.i18n.t('game.pk.errors')(), value: opp.errors, icon: '❌', colorClass: 'text-red-500 font-semibold' }] : [])
        ]
      };
    });
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    if (this.currentRoomMode() === GameMode.Single) return undefined;
    const oppId = this.opponentsPkStats()[0]?.id || this.opponentsPkStats()[0]?.playerId;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.playerId] || 0,
      opponent: wins[oppId] || 0
    };
  });

  @ViewChild('boardContainer') boardContainer!: ElementRef<HTMLDivElement>;
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;
  @ViewChild('board') board!: ElementRef<HTMLDivElement>;
  private ngZone = inject(NgZone);
  private renderer = inject(Renderer2);

  constructor() {
    super();

    effect(() => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        untracked(() => this.gameTimer.startCountdown());
      }
    });

    effect(() => {
      const status = this.store.status();
      const mode = this.currentRoomMode();

      // Elapsed timer logic
      if (status === GameStatus.Playing) {
        if (!this.elapsedInterval) {
          this.elapsedInterval = setInterval(() => {
            const startAt = this.store.startAt();
            if (startAt > 0) {
              const diffMs = Date.now() - startAt;
              const totalSec = Math.max(0, Math.floor(diffMs / 1000));
              this.elapsedSeconds.set(totalSec);
              const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
              const s = (totalSec % 60).toString().padStart(2, '0');
              this.elapsedTime.set(`${m}:${s}`);
            }
          }, 1000);
        }
      } else {
        if (this.elapsedInterval) {
          clearInterval(this.elapsedInterval);
          this.elapsedInterval = null;
        }
        if (status === GameStatus.Waiting || status === GameStatus.Starting) {
          this.elapsedTime.set('00:00');
          this.elapsedSeconds.set(0);
        }
      }
    });

    effect((onCleanup) => {
      const cooldowns = this.store.cooldowns();
      const until = cooldowns[this.playerId] || 0;
      const now = Date.now();
      let interval: any;
      if (until > now) {
        this.frozenRemaining.set(Math.ceil((until - now) / 1000));
        interval = setInterval(() => {
          const rem = Math.ceil((until - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(interval);
            this.frozenRemaining.set(0);
          } else {
            this.frozenRemaining.set(rem);
          }
        }, 200);
      } else {
        this.frozenRemaining.set(0);
      }

      onCleanup(() => {
        if (interval) clearInterval(interval);
      });
    });

    let prevRevealed = 0;
    effect(() => {
      const current = this.store.myRevealedCnt();
      const status = this.store.status();
      if (status !== GameStatus.Playing) {
        prevRevealed = current;
        return;
      }
      const diff = current - prevRevealed;
      if (diff >= 3) {
        this.audioService.playMinesweeperCascade(diff);
        this.vibrateCombo();
      }
      prevRevealed = current;
    });

    effect((onCleanup) => {
      const status = this.store.status();
      if (status === GameStatus.Finished) {
        if (this.isDefeat()) {
           this.audioService.playMinesweeper('explosion');
           this.vibrateError();
        } else {
           this.audioService.playMinesweeper('win');
           this.celebrateVictory();
        }
      }
    });

    effect(() => {
      const storeDiff = this.store.currentDifficulty();
      if (storeDiff && this.currentRoomMode() !== GameMode.Single) {
        untracked(() => this.currentDifficulty.set(storeDiff));
      }
    });

    this.roomLifecycle = setupRoomLifecycle({
      gameId: GameId.Minesweeper,
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => {
        this.currentRoomId.set('');
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
        setTimeout(() => this.changeSingleDifficulty('medium'), 100);
      },
    });
  }

  isFrozen = computed(() => this.frozenRemaining() > 0);
  
  hideLeftPanel = computed(() => {
    const board = this.store.board();
    // Hide left panel if grid is larger than 16 columns (e.g. 30x16, 30x20, 30x24)
    return board.length > 0 && board[0].length > 16;
  });

  elapsedTime = signal<string>('00:00');
  elapsedSeconds = signal<number>(0);
  private elapsedInterval: any;

  override ngOnInit() {
    super.ngOnInit(); // connects lobby WS
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      if (joinInfo.password) this.wsService.setPendingPassword(joinInfo.password);
      if (joinInfo.isCreate) {
        this.handleCreateRoom({
          name: joinInfo.roomId,
          mode: joinInfo.mode,
          difficulty: joinInfo.difficulty,
          password: joinInfo.password,
          bountyCoins: joinInfo.bountyCoins
        });
      } else {
        this.joinRoom(
          joinInfo.roomId,
          joinInfo.mode,
          joinInfo.difficulty,
          joinInfo.host,
          joinInfo.target ?? 1,
          joinInfo.password,
          joinInfo.bountyCoins,
          joinInfo.isSpectator,
          joinInfo.isSpectator ? 'spectate' : 'join'
        );
      }
    } else {
      const savedDiff = getSavedDifficulty('minesweeper', 'easy');
      this.changeSingleDifficulty(savedDiff);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.wsService.disconnect(GameId.Minesweeper);
    this.gameTimer.stopCountdown();
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }

  override handleJoinRoom(event: { roomId: string, mode: string, difficulty: string, host: string, password?: string, bountyCoins?: number, isSpectator?: boolean }) {
    if (this.currentRoomId() === event.roomId && this.isSpectator() === !!event.isSpectator) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinRoom(event.roomId, event.mode, event.difficulty, event.host, 1, event.password, event.bountyCoins, event.isSpectator, event.isSpectator ? 'spectate' : 'join');
  }

  override handleCreateRoom(event: { name: string, mode: string, difficulty: string, password?: string, target?: number, bountyCoins?: number }) {
    this.isMobileSidebarOpen.set(false);
    if (this.gameLayout) {
      this.gameLayout.togglePkDrawer(false);
    }
    this.wsService.setPendingAction('create');
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinRoom(event.name, event.mode, event.difficulty, this.playerId, event.target ?? 1, event.password, event.bountyCoins, false, 'create');
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId?: string, target: number = 1, password?: string, bounty?: number, isSpectator: boolean = false, action?: string) {
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.currentRoomId.set(roomId);
    this.isMobileSidebarOpen.set(false);
    if (!isSpectator && mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, hostId);
    }
    const finalAction = action || (isSpectator ? 'spectate' : 'join');
    this.wsService.setPendingAction(finalAction);
    if (password) {
      this.wsService.setPendingPassword(password);
    }
    this.store.joinRoom(roomId, mode, difficulty, hostId, target, password || '', bounty || 0, isSpectator);
  }




  getSubtitle(): string {
    return this.currentRoomMode() !== GameMode.Single ? this.i18n.t('game.same_pk_speed_label')() : this.i18n.t('game.single_label')();
  }



  handleCellReveal(cell: any) {
    if (!cell.flagged && !cell.revealed) this.vibrateLight();
    this.store.revealCell(cell.x, cell.y);
  }
  handleCellFlag(cell: any) {
    if (!cell.revealed) this.vibrateMedium();
    this.store.toggleFlag(cell.x, cell.y);
  }

  handleReviveWithAd() {
    this.adService.showReviveRewardedAd('minesweeper', () => {
      this.store.reviveGame();
      this.toast.success(this.i18n.t('game.revived')() || '🎉 避雷护盾生效！踩爆的地雷已自动插旗标记，游戏继续！');
    });
  }

  override openChangeSettings() {
    if (this.lobbyPanel && this.currentRoomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.currentRoomId(),
        game: 'minesweeper',
        mode: this.currentRoomMode(),
        difficulty: this.currentDifficulty(),
        host: this.store.hostId()
      });
    }
  }

  isCustomDifficulty(): boolean {
    return this.currentDifficulty().startsWith('custom_');
  }

  customWidth(): string {
    return this.isCustomDifficulty() ? this.currentDifficulty().split('_')[1] : '';
  }

  customHeight(): string {
    return this.isCustomDifficulty() ? this.currentDifficulty().split('_')[2] : '';
  }

  customMines(): string {
    return this.isCustomDifficulty() ? this.currentDifficulty().split('_')[3] : '';
  }

  openCustomDialog() {
    this.showCustomDialog.set(true);
  }

  confirmCustomGame() {
    let w = this.customW();
    let h = this.customH();
    let m = this.customM();
    
    // Validate bounds
    w = Math.max(9, Math.min(50, w));
    h = Math.max(9, Math.min(50, h));
    const maxMines = Math.floor(w * h * 0.8);
    m = Math.max(10, Math.min(maxMines, m));
    
    this.showCustomDialog.set(false);
    const diffId = `custom_${w}_${h}_${m}`;
    this.changeSingleDifficulty(diffId);
  }

  changeSingleDifficulty(diff: string) {
    if (this.currentRoomMode() !== GameMode.Single || this.store.roomId()) {
      return;
    }
    if (diff === 'custom') {
      this.openCustomDialog();
      return;
    }
    
    let width = 16, height = 16, mines = 40;
    if (diff.startsWith('custom_')) {
      const parts = diff.split('_');
      width = parseInt(parts[1], 10); height = parseInt(parts[2], 10); mines = parseInt(parts[3], 10);
    } else {
      switch (diff) {
        case 'easy': width = 9; height = 9; mines = 10; break;
        case 'medium': width = 16; height = 16; mines = 40; break;
        case 'hard': width = 30; height = 16; mines = 99; break;
        case 'expert': width = 30; height = 20; mines = 160; break;
        case 'master': width = 30; height = 24; mines = 230; break;
        default: 
          diff = 'medium'; 
          width = 16; height = 16; mines = 40; 
          break;
      }
    }
    
    this.currentDifficulty.set(diff);
    setSavedDifficulty('minesweeper', diff);
    this.currentRoomMode.set(GameMode.Single);
    this.store.startLocalGame(width, height, mines, diff);

    this.cellSize.set(this.calculateAdaptiveCellSize(width));
  }

  calculateAdaptiveCellSize(cols: number): number {
    if (typeof window === 'undefined') return this.defaultCellSize;
    const screenW = window.innerWidth;
    const isMobile = screenW < 640;
    const isTablet = screenW >= 640 && screenW < 1024;

    if (cols <= 9) {
      if (isMobile) {
        const ideal = Math.floor((screenW - 28) / 9);
        return Math.max(36, Math.min(48, ideal));
      }
      if (isTablet) return 46;
      return 42;
    } else if (cols <= 16) {
      if (isMobile) return 32;
      if (isTablet) {
        const ideal = Math.floor((screenW - 48) / 16);
        return Math.max(34, Math.min(42, ideal));
      }
      return 36;
    } else {
      if (isMobile) return 26;
      if (isTablet) return 28;
      return 30;
    }
  }

  getDifficultyDisplayName(): string {
    const diff = this.currentDifficulty();
    if (diff.startsWith('custom_')) {
      const parts = diff.split('_');
      return `${this.i18n.t('game.custom')() || '自定义'} (${parts[1]}×${parts[2]})`;
    }
    const d = this.predefinedDifficulties.find((x: any) => x.id === diff);
    return d ? `${this.i18n.t(d.labelKey as any)()} (${d.desc})` : diff;
  }

  getDifficultyText(difficulty: string): string {
    const d = this.predefinedDifficulties.find((x: any) => x.id === difficulty);
    return d ? `${this.i18n.t(d.labelKey as any)()} (${d.desc})` : difficulty;
  }

  getPlayerScores() {
    const scores = this.store.scores();
    const players = Object.keys(scores).map(id => ({ id, score: scores[id] }));

    // Sort logic: current player first, then others by score (descending)
    return players.sort((a, b) => {
      if (a.id === this.playerId) return -1;
      if (b.id === this.playerId) return 1;
      return b.score - a.score;
    });
  }

  hasWonSpeedMode(): boolean {
    const scores = this.store.scores();
    return scores[this.playerId] > 0;
  }

  getOverlayStatus(): GameResultType {
    if (this.currentRoomMode() === GameMode.Speed) {
      return this.hasWonSpeedMode() ? GameResult.Win : GameResult.Lose;
    }
    return this.isDefeat() ? GameResult.Lose : GameResult.Win;
  }

  getOverlayTitle(): string {
    const status = this.getOverlayStatus();
    if (this.currentRoomMode() !== GameMode.Single && !this.store.isSeriesOver()) {
      return status === GameResult.Win ? this.i18n.t('game.round_won')() : this.i18n.t('game.round_lost')();
    }
    if (status === GameResult.Win) {
      return this.currentRoomMode() === GameMode.Speed ? this.i18n.t('game.you_win')() : this.i18n.t('minesweeper.victory')();
    }
    return this.i18n.t('game.you_lose')();
  }

  getOverlaySubtitle(): string {
    if (this.currentRoomMode() !== GameMode.Single && !this.store.isSeriesOver()) {
      return this.store.pkScoreLabel();
    }
    if (this.currentRoomMode() === GameMode.Speed) {
      return this.hasWonSpeedMode() ? this.i18n.t('game.cleared_first')() : this.i18n.t('game.opponent_finished')();
    }
    if (this.isDefeat()) {
      return this.currentRoomMode() === GameMode.Single ? this.i18n.t('game.stepped_mine')() : this.i18n.t('game.steal_defeat')();
    }
    return this.currentRoomMode() === GameMode.Single ? this.i18n.t('minesweeper.cleared')() : this.i18n.t('game.steal_victory')();
  }

  getOverlayStats() {
    const stats: { label: string, value: string | number }[] = [];

    // Time spent is relevant for single and speed mode
    if (this.currentRoomMode() !== GameMode.Steal) {
      let timeStr = this.elapsedTime();
      if (this.currentRoomMode() === GameMode.Single) {
        const start = this.store.startAt();
        if (start > 0) {
          const diffMs = Date.now() - start;
          const totalSec = Math.max(0, Math.floor(diffMs / 1000));
          const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
          const s = (totalSec % 60).toString().padStart(2, '0');
          timeStr = `${m}:${s}`;
        }
      }
      if (timeStr && timeStr !== '00:00') {
        stats.push({ label: 'TIME', value: timeStr });
      }

      if (this.currentRoomMode() === GameMode.Single) {
        const best = this.store.bestTime();
        if (best > 0) {
          const m = Math.floor(best / 60).toString().padStart(2, '0');
          const s = (best % 60).toString().padStart(2, '0');
          stats.push({ label: 'BEST', value: `${m}:${s}` });
        }
      }
    }

    // Score (flags) is relevant for steal mode
    if (this.currentRoomMode() === GameMode.Steal) {
      const scores = this.store.scores();
      const myScore = scores[this.playerId] || 0;
      stats.push({ label: 'SCORE', value: myScore });
    }

    return stats;
  }

  formatBestTime(): string {
    const best = this.store.bestTime();
    if (best <= 0) return '00:00';
    const m = Math.floor(best / 60).toString().padStart(2, '0');
    const s = (best % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
