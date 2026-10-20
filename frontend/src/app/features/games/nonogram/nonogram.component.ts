import { Component, computed, inject, ChangeDetectionStrategy, ViewChild, ElementRef, OnInit, OnDestroy, signal, effect, untracked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonogramStore } from './store/nonogram.store';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameStatus, GameMode, GameDifficulty } from '../../../core/models/game.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameId } from '../../../core/models/game.model';
import { FormsModule } from '@angular/forms';
import { AdService } from '../../../core/services/ad.service';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { HapticService } from '../../../core/services/haptic.service';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats, PkMetric } from '../../../shared/components/game-pk-hud/game-pk-hud.model';


@Component({
  selector: 'app-nonogram',
  standalone: true,
  imports: [CommonModule, FormsModule, GameWaitingRoomComponent, GameResultOverlayComponent, GameStartingOverlayComponent, GameToolbarComponent, GameLayoutComponent, GamePkHudComponent],
  templateUrl: './nonogram.component.html',
  styleUrls: ['./nonogram.component.css'],
  providers: [NonogramStore],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NonogramComponent extends BaseGameComponent implements OnInit, OnDestroy {
  getSubtitle() { return ""; }

  override store = inject(NonogramStore);
  private windowSize = inject(WindowSizeService);
  public i18n = inject(I18nService);
  private authStore = inject(AuthStore);
  private adService = inject(AdService);
  private gameRegistry = inject(GameRegistryService);
  private haptic = inject(HapticService);

  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;

  readonly GameStatus = GameStatus;
  readonly GameMode = GameMode;
  readonly GameDifficulty = GameDifficulty;

  private roomLifecycle: RoomLifecycleHandle;

  predefinedDifficulties = this.gameRegistry.getConfig('nonogram')?.difficulties || [];

  showRules = signal<boolean>(false);
  showOverlay = signal<boolean>(false);

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  get t() {
    return this.i18n.t.bind(this.i18n);
  }



  getPlayerScores() {
    if (this.store.currentRoomMode() === GameMode.Single) {
      return [{ id: this.playerId, score: 0, progress: this.store.localProgress() }];
    }
    const raw = this.store.rawState() as any;
    const enginePlayers = raw?.players || {};
    return this.store.playersList().map((p: any) => {
      const ep = (typeof enginePlayers === 'object' && !Array.isArray(enginePlayers))
        ? (enginePlayers[p.id] || enginePlayers[String(p.id)])
        : (Array.isArray(enginePlayers) ? enginePlayers.find((x: any) => x?.id === p.id) : null);

      let prog = Number(p.progress ?? ep?.progress ?? 0);
      if (p.id === this.playerId) {
        prog = Math.max(prog, this.store.localProgress());
      }
      return {
        id: p.id,
        score: p.score ?? ep?.score ?? 0,
        progress: prog
      };
    });
  }

  changeSingleDifficulty(diff: string) {
    if (this.store.roomId()) return;
    this.store.currentDifficulty.set(diff);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nonogram_difficulty', diff);
    }
    this.store.playAgain();
  }

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: GameId.Nonogram,
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        if (this.roomLifecycle) {
          this.roomLifecycle.clearReconnectInfo();
        }
      },
    });

    effect(() => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        untracked(() => this.gameTimer.startCountdown());
      }
    });

    // Show result overlay with a delay after game finishes
    effect((onCleanup) => {
      if (this.store.status() === GameStatus.Finished) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '', pending.target ?? 1);
      return;
    } else {
      const savedDiff = typeof localStorage !== 'undefined' ? localStorage.getItem('nonogram_difficulty') : null;
      const initialDiff = savedDiff || GameDifficulty.Easy;
      this.store.currentDifficulty.set(initialDiff);
      this.store.joinRoom('', GameMode.Single, initialDiff);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  

  readonly hideLeftPanel = computed(() => this.store.width() > 15);

  readonly cellSize = computed(() => {
    const w = this.store.width();
    const h = this.store.height();
    const vw = this.windowSize.size().w;
    const vh = this.windowSize.size().h;

    // Actual max hint length per row and column
    const rowHints: number[][] = (this.store.rowHints() as any) || [];
    const colHints: number[][] = (this.store.colHints() as any) || [];
    const maxRowHints = rowHints.length > 0 ? Math.max(...rowHints.map((r: number[]) => r.length), 1) : 1;
    const maxColHints = colHints.length > 0 ? Math.max(...colHints.map((c: number[]) => c.length), 1) : 1;

    // Dynamic hint area equivalents in cell units (matching actual font and padding in CSS)
    const rowHintEq = Math.max(1.8, maxRowHints * 0.42 + 0.4);
    const colHintEq = Math.max(1.8, maxColHints * 0.46 + 0.4);

    const totalCols = w + rowHintEq;
    const totalRows = h + colHintEq;

    // Available width inside the game stage card (max-w 1400px, no side panels)
    let containerPadding = 32;
    if (vw >= 1024) {
      containerPadding = 72;
    } else if (vw >= 640) {
      containerPadding = 56; // Tablet portrait / landscape
    }

    const maxContainerW = Math.min(vw, 1400);
    const availW = Math.max(280, maxContainerW - containerPadding);

    // Available vertical height in viewport:
    // Header + Subheader + Toolbar + Card margins ≈ 210px
    const availH = Math.max(300, vh - 210);

    const sizeW = Math.floor(availW / totalCols);
    const sizeH = Math.floor(availH / totalRows);

    let calculatedSize: number;
    if (vw >= 640) {
      // On tablet and desktop, fit both width and height to give comfortable margins
      calculatedSize = Math.min(sizeW, sizeH);
    } else {
      // On narrow mobile devices, allow horizontal scroll if needed for dense grids
      calculatedSize = Math.max(19, sizeW);
    }

    // Adaptive min/max cell bounds per grid density to guarantee high readability & touch ergonomics
    let minSize = 19;
    let maxSize = 72;

    if (vw >= 640) {
      if (w >= 25) {
        minSize = 23;
        maxSize = 36;
      } else if (w >= 20) {
        minSize = 27;
        maxSize = 44;
      } else if (w >= 15) {
        minSize = 32;
        maxSize = 52;
      } else if (w >= 10) {
        minSize = 42;
        maxSize = 62;
      } else {
        minSize = 52;
        maxSize = 76;
      }
    }

    return Math.max(minSize, Math.min(calculatedSize, maxSize));
  });

  @ViewChild('cellsGrid') cellsGridRef?: ElementRef<HTMLElement>;

  private isDragging = false;
  private activePointerId: number | null = null;
  private currentBatchId: number = 0;
  private dragTargetState: number = -1;
  private lastCoord: { x: number; y: number } | null = null;
  private startCoord: { x: number; y: number } | null = null;
  private startPointerPos: { x: number; y: number } | null = null;
  private longPressTimer: any = null;
  private isLongPressTriggered = false;
  private hasPaintedStartCell = false;
  private pointerHandled = false;

  private clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private getLineCells(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let currX = x0;
    let currY = y0;
    const w = this.store.width();
    const h = this.store.height();

    while (true) {
      if (currX >= 0 && currX < w && currY >= 0 && currY < h) {
        points.push({ x: currX, y: currY });
      }
      if (currX === x1 && currY === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currY += sy;
      }
    }
    return points;
  }

  private getCoordFromClient(clientX: number, clientY: number): { x: number; y: number } | null {
    // 1. Try DOM element hit first
    const el = document.elementFromPoint(clientX, clientY);
    if (el) {
      const cellEl = el.closest('.cell') as HTMLElement | null;
      if (cellEl) {
        const xStr = cellEl.getAttribute('data-x');
        const yStr = cellEl.getAttribute('data-y');
        if (xStr !== null && yStr !== null) {
          const x = parseInt(xStr, 10);
          const y = parseInt(yStr, 10);
          if (!isNaN(x) && !isNaN(y)) {
            return { x, y };
          }
        }
      }
    }

    // 2. Geometric fallback
    const gridEl = this.cellsGridRef?.nativeElement;
    if (!gridEl) return null;
    const rect = gridEl.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) return null;

    const w = this.store.width();
    const h = this.store.height();
    if (w <= 0 || h <= 0) return null;

    const cellW = rect.width / w;
    const cellH = rect.height / h;
    const x = Math.floor(relX / cellW);
    const y = Math.floor(relY / cellH);

    if (x >= 0 && x < w && y >= 0 && y < h) {
      return { x, y };
    }
    return null;
  }

  handlePointerDown(event: PointerEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    if (event.button !== 0 && event.button !== 2) return;

    this.pointerHandled = true;
    const coord = this.getCoordFromClient(event.clientX, event.clientY);
    if (!coord) return;

    if (event.cancelable) event.preventDefault();

    try {
      (event.currentTarget as HTMLElement)?.setPointerCapture(event.pointerId);
    } catch (_) {}

    this.clearLongPressTimer();
    this.isDragging = true;
    this.activePointerId = event.pointerId;
    this.currentBatchId = Date.now();
    this.startCoord = coord;
    this.lastCoord = coord;
    this.startPointerPos = { x: event.clientX, y: event.clientY };
    this.isLongPressTriggered = false;
    this.hasPaintedStartCell = false;

    const isRightClick = event.button === 2;
    const isTouch = event.pointerType === 'touch' || event.pointerType === 'pen';

    if (isRightClick) {
      // Right-click: immediate cross
      this.dragTargetState = this.store.determineNextState(coord.x, coord.y, true, 'cross');
      this.store.setCellsBatch([coord], this.dragTargetState as any, this.currentBatchId);
      this.hasPaintedStartCell = true;
      this.haptic.vibrateLight();
      return;
    }

    if (isTouch) {
      // Touch: start long-press timer (300ms) to toggle cross (❌) if user holds still
      this.dragTargetState = -1;
      this.longPressTimer = setTimeout(() => {
        if (this.isDragging && !this.isLongPressTriggered && this.startCoord) {
          this.isLongPressTriggered = true;
          // Long-press activated: mark as cross (❌)
          this.dragTargetState = this.store.determineNextState(this.startCoord.x, this.startCoord.y, true, 'cross');
          this.store.setCellsBatch([this.startCoord], this.dragTargetState as any, this.currentBatchId);
          this.hasPaintedStartCell = true;
          this.haptic.vibrateMedium();
        }
      }, 300);
    } else {
      // Desktop mouse left-click: apply immediately
      this.dragTargetState = this.store.determineNextState(coord.x, coord.y, false);
      this.store.setCellsBatch([coord], this.dragTargetState as any, this.currentBatchId);
      this.hasPaintedStartCell = true;
      this.haptic.vibrateLight();
    }
  }

  handlePointerMove(event: PointerEvent) {
    if (!this.isDragging) return;
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;

    if (event.cancelable) event.preventDefault();

    // Check if moved significantly (> 8px) before long press triggered
    if (this.startPointerPos && !this.isLongPressTriggered) {
      const dist = Math.hypot(event.clientX - this.startPointerPos.x, event.clientY - this.startPointerPos.y);
      if (dist > 8) {
        this.clearLongPressTimer();
        // If start cell was deferred, apply default draw mode to start cell now
        if (!this.hasPaintedStartCell && this.startCoord) {
          this.dragTargetState = this.store.determineNextState(this.startCoord.x, this.startCoord.y, false);
          this.store.setCellsBatch([this.startCoord], this.dragTargetState as any, this.currentBatchId);
          this.hasPaintedStartCell = true;
          this.haptic.vibrateLight();
        }
      }
    }

    const coord = this.getCoordFromClient(event.clientX, event.clientY);
    if (!coord) return;

    // Moving to another cell also cancels long press
    if (this.startCoord && (coord.x !== this.startCoord.x || coord.y !== this.startCoord.y)) {
      this.clearLongPressTimer();
      if (!this.hasPaintedStartCell && this.startCoord) {
        this.dragTargetState = this.store.determineNextState(this.startCoord.x, this.startCoord.y, false);
        this.store.setCellsBatch([this.startCoord], this.dragTargetState as any, this.currentBatchId);
        this.hasPaintedStartCell = true;
        this.haptic.vibrateLight();
      }
    }

    if (this.lastCoord) {
      if (this.lastCoord.x === coord.x && this.lastCoord.y === coord.y) {
        return;
      }
      const lineCells = this.getLineCells(this.lastCoord.x, this.lastCoord.y, coord.x, coord.y);
      if (lineCells.length > 0 && this.dragTargetState !== -1) {
        this.store.setCellsBatch(lineCells, this.dragTargetState as any, this.currentBatchId);
        this.haptic.vibrateLight();
      }
    } else {
      if (this.dragTargetState !== -1) {
        this.store.setCellsBatch([coord], this.dragTargetState as any, this.currentBatchId);
        this.haptic.vibrateLight();
      }
    }

    this.lastCoord = coord;
  }

  handlePointerUp(event: PointerEvent) {
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;

    // If released before long-press triggered and hasn't moved (short tap)
    if (this.longPressTimer && !this.isLongPressTriggered && !this.hasPaintedStartCell && this.startCoord) {
      this.clearLongPressTimer();
      this.dragTargetState = this.store.determineNextState(this.startCoord.x, this.startCoord.y, false);
      this.store.setCellsBatch([this.startCoord], this.dragTargetState as any, this.currentBatchId);
      this.haptic.vibrateLight();
    }

    this.clearLongPressTimer();
    this.endDrag(event);
  }

  handlePointerCancel(event: PointerEvent) {
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
    this.clearLongPressTimer();
    this.endDrag(event);
  }

  private endDrag(event?: PointerEvent) {
    if (event && this.activePointerId !== null) {
      try {
        (event.currentTarget as HTMLElement)?.releasePointerCapture(event.pointerId);
      } catch (_) {}
    }
    this.clearLongPressTimer();
    this.isDragging = false;
    this.activePointerId = null;
    this.lastCoord = null;
    this.startCoord = null;
    this.startPointerPos = null;
    this.isLongPressTriggered = false;
    this.hasPaintedStartCell = false;
    this.dragTargetState = -1;
  }

  handleTouchFallbackStart(event: TouchEvent) {
    if (this.pointerHandled || this.store.status() !== GameStatus.Playing) return;
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const coord = this.getCoordFromClient(touch.clientX, touch.clientY);
    if (!coord) return;

    if (event.cancelable) event.preventDefault();

    this.clearLongPressTimer();
    this.isDragging = true;
    this.currentBatchId = Date.now();
    this.startCoord = coord;
    this.lastCoord = coord;
    this.startPointerPos = { x: touch.clientX, y: touch.clientY };
    this.isLongPressTriggered = false;
    this.hasPaintedStartCell = false;
    this.dragTargetState = -1;

    this.longPressTimer = setTimeout(() => {
      if (this.isDragging && !this.isLongPressTriggered && this.startCoord) {
        this.isLongPressTriggered = true;
        this.dragTargetState = this.store.determineNextState(this.startCoord.x, this.startCoord.y, true, 'cross');
        this.store.setCellsBatch([this.startCoord], this.dragTargetState as any, this.currentBatchId);
        this.hasPaintedStartCell = true;
        this.haptic.vibrateMedium();
      }
    }, 300);
  }

  handleTouchFallbackMove(event: TouchEvent) {
    if (this.pointerHandled || !this.isDragging || event.touches.length === 0) return;
    if (event.cancelable) event.preventDefault();

    const touch = event.touches[0];
    if (this.startPointerPos && !this.isLongPressTriggered) {
      const dist = Math.hypot(touch.clientX - this.startPointerPos.x, touch.clientY - this.startPointerPos.y);
      if (dist > 8) {
        this.clearLongPressTimer();
        if (!this.hasPaintedStartCell && this.startCoord) {
          this.dragTargetState = this.store.determineNextState(this.startCoord.x, this.startCoord.y, false);
          this.store.setCellsBatch([this.startCoord], this.dragTargetState as any, this.currentBatchId);
          this.hasPaintedStartCell = true;
          this.haptic.vibrateLight();
        }
      }
    }

    const coord = this.getCoordFromClient(touch.clientX, touch.clientY);
    if (!coord) return;

    if (this.startCoord && (coord.x !== this.startCoord.x || coord.y !== this.startCoord.y)) {
      this.clearLongPressTimer();
      if (!this.hasPaintedStartCell && this.startCoord) {
        this.dragTargetState = this.store.determineNextState(this.startCoord.x, this.startCoord.y, false);
        this.store.setCellsBatch([this.startCoord], this.dragTargetState as any, this.currentBatchId);
        this.hasPaintedStartCell = true;
        this.haptic.vibrateLight();
      }
    }

    if (this.lastCoord) {
      if (this.lastCoord.x === coord.x && this.lastCoord.y === coord.y) return;
      const lineCells = this.getLineCells(this.lastCoord.x, this.lastCoord.y, coord.x, coord.y);
      if (lineCells.length > 0 && this.dragTargetState !== -1) {
        this.store.setCellsBatch(lineCells, this.dragTargetState as any, this.currentBatchId);
        this.haptic.vibrateLight();
      }
    }
    this.lastCoord = coord;
  }

  handleTouchFallbackEnd() {
    if (this.pointerHandled) return;
    if (this.longPressTimer && !this.isLongPressTriggered && !this.hasPaintedStartCell && this.startCoord) {
      this.clearLongPressTimer();
      this.dragTargetState = this.store.determineNextState(this.startCoord.x, this.startCoord.y, false);
      this.store.setCellsBatch([this.startCoord], this.dragTargetState as any, this.currentBatchId);
      this.haptic.vibrateLight();
    }
    this.clearLongPressTimer();
    this.isDragging = false;
    this.lastCoord = null;
    this.startCoord = null;
    this.startPointerPos = null;
    this.isLongPressTriggered = false;
    this.hasPaintedStartCell = false;
    this.dragTargetState = -1;
  }

  useHint() {
    this.adService.showRewardedAd(() => {
      this.store.useHint();
    });
  }

  onContextMenu(event: Event) {
    event.preventDefault(); // Prevent native right-click menu
  }

  isDefeat = computed(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return false;

    const raw = this.store.rawState() as any;
    if (raw) {
      if (raw.winner) {
        return raw.winner !== this.playerId;
      }
      if (Array.isArray(raw.winners) && raw.winners.length > 0) {
        return !raw.winners.includes(this.playerId);
      }
    }

    const playersList = this.getPlayerScores();
    const me = playersList.find(p => p.id === this.playerId);
    if (!me) return true;

    return (me.progress || 0) < 100;
  });

  myProgress = computed(() => {
    return this.getPlayerScores().find(p => p.id === this.playerId)?.progress || 0;
  });

  myScore = computed(() => {
    return this.getPlayerScores().find(p => p.id === this.playerId)?.score || 0;
  });

  myPlayerHUD = computed(() => {
    const prog = Math.round(this.myProgress());
    return {
      playerName: this.playerId,
      isHost: this.playerId === this.store.hostId(),
      stats: this.store.currentRoomMode() === GameMode.Speed 
        ? [{ icon: '📊', value: prog + '%' }] 
        : [{ icon: '⭐', value: this.myScore() }],
      status: this.store.status() === GameStatus.Finished ? 'finished' : 'playing'
    };
  });

  myPlayerPkStats = computed<PkPlayerStats>(() => {
    const prog = Math.max(Math.round(this.myProgress()), this.store.localProgress());
    const myId = this.playerId;
    const wins = this.store.pkWins()[myId] || 0;
    const target = this.store.currentRoomTarget();
    const isFinished = this.store.status() === GameStatus.Finished;
    const metrics: PkMetric[] = [];

    if (target > 1) {
      metrics.push({ icon: '🏆', label: 'WIN', value: `${wins}/${target}` });
    }

    return {
      id: myId,
      nickname: myId,
      isMe: true,
      isHost: myId === this.store.hostId(),
      isFinished,
      progress: prog,
      score: this.myScore(),
      wins,
      metrics,
      status: isFinished ? 'finished' : 'playing'
    };
  });

  opponentsHUD = computed(() => {
    return this.getPlayerScores()
      .filter(p => p.id !== this.playerId)
      .map(opp => ({
        playerName: opp.id,
        isHost: opp.id === this.store.hostId(),
        stats: this.store.currentRoomMode() === GameMode.Speed 
          ? [{ icon: '📊', value: Math.round(opp.progress || 0) + '%' }] 
          : [{ icon: '⭐', value: opp.score || 0 }],
        status: this.store.status() === GameStatus.Finished ? 'finished' : 'playing'
      }));
  });

  opponentsPkStats = computed<PkPlayerStats[]>(() => {
    const target = this.store.currentRoomTarget();
    const isFinished = this.store.status() === GameStatus.Finished;
    const myId = this.playerId;
    const hostId = this.store.hostId();
    const winsMap = this.store.pkWins();

    let players = this.getPlayerScores();
    if (!players || players.length <= 1) {
      const pl = this.store.playersList();
      if (pl && pl.length > players.length) {
        players = pl;
      }
    }

    return players
      .filter(p => p && p.id !== myId)
      .map(opp => {
        const oppProg = Math.round(Number(opp.progress || 0));
        const wins = winsMap[opp.id] || 0;
        const metrics: PkMetric[] = [];

        if (target > 1) {
          metrics.push({ icon: '🏆', label: 'WIN', value: `${wins}/${target}` });
        }

        return {
          id: opp.id,
          nickname: opp.id,
          isMe: false,
          isHost: opp.id === hostId,
          isFinished: isFinished || oppProg === 100,
          progress: oppProg,
          score: opp.score || 0,
          wins,
          metrics,
          status: (isFinished || oppProg === 100) ? 'finished' : 'playing'
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

  getGameResult(): 'win' | 'lose' {
    if (this.store.currentRoomMode() === GameMode.Single) return 'win';
    return this.isDefeat() ? 'lose' : 'win';
  }

  override handleRematch() {
    this.store.playAgain();
  }

  handleRestart() {
    this.store.playAgain();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    
    // Quick restart in single player
    if (key === 'r' && this.store.currentRoomMode() === GameMode.Single) {
      this.handleRestart();
      event.preventDefault();
      return;
    }

    // Undo
    if (key === 'z') {
      if (this.store.history().length > 0 && this.store.currentRoomMode() !== GameMode.Steal) {
        this.store.undo();
        event.preventDefault();
        return;
      }
    }

    // Toggle Draw Mode (Fill vs Cross)
    if (key === 'x' || event.code === 'Space') {
      const nextMode = this.store.drawMode() === 'fill' ? 'cross' : 'fill';
      this.store.setDrawMode(nextMode);
      event.preventDefault();
      return;
    }

    // Hint
    if (key === 'h' && this.store.currentRoomMode() === GameMode.Single) {
      this.store.useHint();
      event.preventDefault();
      return;
    }
  }

  override handleDismissRoom() {
    this.dismissRoom();
  }
}
