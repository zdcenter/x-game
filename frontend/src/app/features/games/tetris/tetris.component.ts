import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { AdService } from '../../../core/services/ad.service';
import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { Component, HostListener, OnDestroy, OnInit, inject, effect, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { TetrisStore } from './store/tetris.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { ToastService } from '../../../core/services/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { TETRIS_COLS, TETRIS_ROWS, TETROMINO_COLORS, Tetromino, TETROMINO_SHAPES } from './models/tetris.model';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';

import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { GamePlayerMiniHudComponent } from '../../../shared/components/game-player-mini-hud/game-player-mini-hud.component';

@Component({
  selector: 'app-tetris',
  standalone: true,
  imports: [GameSpectatingOverlayComponent, CommonModule, GameWaitingRoomComponent, GameLobbyPanelComponent, GameRulesModalComponent, GameResultOverlayComponent, GameHeaderComponent, GameStartingOverlayComponent, PlayerBadgeComponent, PlayerListContainerComponent, GamePlayerMiniHudComponent,
    ],
  templateUrl: './tetris.component.html',
  styleUrls: ['./tetris.component.css'],
  providers: [TetrisStore]
})
export class TetrisComponent extends BaseGameComponent implements OnInit, OnDestroy {
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => {
    const opps = this.store.opponents().map(opp => ({
      id: opp.id,
      score: opp.score || 0,
      status: opp.finished ? 'finished' : 'playing'
    }));
    const me = {
      id: this.playerId,
      score: this.store.score(),
      status: this.store.status() === GameStatus.Finished ? 'finished' : 'playing'
    };
    return [me, ...opps];
  });
  adService = inject(AdService);
  GameDifficulty = GameDifficulty;
  GameStatus = GameStatus;
  GameMode = GameMode;
  @ViewChild('boardArea') boardArea!: ElementRef<HTMLDivElement>;
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;
  override store = inject(TetrisStore);
  private authStore = inject(AuthStore);
  public timerService = inject(GameTimerService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  i18n = inject(I18nService);
  private gameRegistry = inject(GameRegistryService);

  readonly COLS = TETRIS_COLS;
  readonly ROWS = TETRIS_ROWS;
  readonly COLORS = TETROMINO_COLORS;
  currentRoomMode = this.store.currentRoomMode;
  currentRoomId = computed(() => this.wsService.gameState()?.roomId || '');
  showRules = signal(false);
  showOverlay = signal(false);
  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  isShaking = signal(false);
  showLevelUp = signal(false);
  levelUpNum = signal(0);
  showCombo = signal(false);
  comboCount = signal(0);

  // Touch Handling properties
  private touchStartX = 0;
  private touchStartY = 0;
  private lastProcessedX = 0;
  private lastProcessedY = 0;
  private touchStartTime = 0;
  private hasMoved = false;

  private roomLifecycle: RoomLifecycleHandle;

  constructor() {
    super();
    effect((onCleanup) => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }

      if (status === GameStatus.Finished) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });

    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'tetris',
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });

    effect(() => {
      const trigger = this.store.shakeTrigger();
      if (trigger > 0) {
        this.isShaking.set(false);
        setTimeout(() => { this.isShaking.set(true); setTimeout(() => this.isShaking.set(false), 420); }, 0);
      }
    });

    effect(() => {
      const lv = this.store.levelUpSignal();
      if (lv > 0) { this.levelUpNum.set(lv); this.showLevelUp.set(true); setTimeout(() => this.showLevelUp.set(false), 1600); }
    });

    effect(() => {
      const c = this.store.comboTrigger();
      if (c > 0) { this.comboCount.set(c); this.showCombo.set(true); setTimeout(() => this.showCombo.set(false), 1100); }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '', pending.target ?? 1);
      if (pending.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      this.store.joinRoom('local', GameMode.Single, 'normal', '');
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  override handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string, password?: string}) {
    if (this.currentRoomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(event.roomId, event.mode, event.difficulty, event.host);
    }
    this.isMobileSidebarOpen.set(false);
  }

  override handleCreateRoom(config: {name: string, mode: string, difficulty: string, password?: string}) {
    if (config.password) this.wsService.setPendingPassword(config.password);
    this.store.joinRoom(config.name, config.mode, config.difficulty, this.playerId);
    if (config.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(config.name, config.mode, config.difficulty, this.playerId);
    }
    this.isMobileSidebarOpen.set(false);
  }

  

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    
    switch (event.code) {
      case 'ArrowLeft':
        this.store.moveLeft();
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.store.moveRight();
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.store.rotate();
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.store.softDrop();
        event.preventDefault();
        break;
      case 'Space':
        this.store.hardDrop();
        event.preventDefault();
        break;
    }
  }

  onTouchStart(e: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.lastProcessedX = this.touchStartX;
    this.lastProcessedY = this.touchStartY;
    this.touchStartTime = Date.now();
    this.hasMoved = false;
  }

  onTouchMove(e: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const dx = currentX - this.lastProcessedX;
    const dy = currentY - this.lastProcessedY;

    // Horizontal movement
    if (Math.abs(dx) > 25) {
      if (dx > 0) {
        this.store.moveRight();
      } else {
        this.store.moveLeft();
      }
      this.lastProcessedX = currentX;
      this.hasMoved = true;
    }

    // Vertical soft drop (only downwards)
    if (dy > 35) {
      this.store.softDrop();
      this.lastProcessedY = currentY;
      this.hasMoved = true;
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    const currentX = e.changedTouches[0].clientX;
    const currentY = e.changedTouches[0].clientY;
    const totalDx = currentX - this.touchStartX;
    const totalDy = currentY - this.touchStartY;
    const duration = Date.now() - this.touchStartTime;

    if (!this.hasMoved && duration < 300 && Math.abs(totalDx) < 10 && Math.abs(totalDy) < 10) {
      // Tap -> Rotate
      this.store.rotate();
    } else if (totalDy > 60 && duration < 300 && totalDy > Math.abs(totalDx)) {
      // Fast flick down -> Hard Drop
      this.store.hardDrop();
    }
  }

  getPieceColor(type: Tetromino): string {
    return this.COLORS[type] || 'transparent';
  }

  getShapeArray(type: Tetromino): number[][] {
    return TETROMINO_SHAPES[type] || [];
  }

  // Used for rendering ghost piece and current piece
  getCellColor(x: number, y: number): string {
    const grid = this.store.grid();
    if (grid[y] && grid[y][x] !== 0) {
      return this.getPieceColor(grid[y][x]);
    }

    const current = this.store.currentPiece();
    if (current &&
        x >= current.x && x < current.x + current.shape[0].length &&
        y >= current.y && y < current.y + current.shape.length &&
        current.shape[y - current.y][x - current.x] !== 0) {
      return this.getPieceColor(current.type);
    }

    // Ghost piece preview
    const ghostY = this.store.ghostY();
    if (ghostY !== -1 && current && ghostY !== current.y &&
        x >= current.x && x < current.x + current.shape[0].length &&
        y >= ghostY && y < ghostY + current.shape.length &&
        current.shape[y - ghostY]?.[x - current.x] !== 0) {
      return this.getPieceColor(current.type) + '40';
    }

    return 'var(--color-bg-card)';
  }



  getSubtitle(): string {
    return this.currentRoomMode() === 'diff_pk_attack' ? this.i18n.t('tetris.mode.diff_pk_attack')() : this.i18n.t('tetris.mode.single')();
  }





  override openChangeSettings() {
    if (this.lobbyPanel && this.currentRoomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.currentRoomId(),
        game: 'tetris',
        mode: this.currentRoomMode(),
        difficulty: '',
        host: this.store.hostId()
      });
    }
  }

  getPlayerScores(): Array<{id: string; score: number}> {
    const scores = this.store.opponents().map(opp => ({
      id: opp.id,
      score: opp.score
    }));
    scores.push({ id: this.playerId, score: this.store.score() });
    return scores;
  }
  
  getOverlayStats() {
    const stats: { label: string, value: string | number }[] = [
      { label: this.i18n.t('tetris.score')() || 'SCORE', value: this.store.score() }
    ];
    if (this.currentRoomMode() === GameMode.Single) {
      const best = this.store.bestScore();
      if (best > 0) {
        stats.push({ label: 'BEST', value: best });
      }
    }
    return stats;
  }
}
