import { Component, computed, inject, ChangeDetectionStrategy, ViewChild, ElementRef, OnInit, OnDestroy, signal, effect, untracked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonogramStore } from './store/nonogram.store';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { GameStatus, GameMode, GameDifficulty } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
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
import { DeviceService } from '../../../core/services/device.service';
import { CoinService } from '../../../core/services/coin.service';
import { CoinGuideService } from '../../../core/services/coin-guide.service';
import { ZenModeService } from '../../../core/services/zen-mode.service';
import { PwaService } from '../../../core/services/pwa.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { CoinIconComponent } from '../../../shared/components/coin-icon/coin-icon.component';

import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';
import { DifficultySelectorComponent } from '../../../shared/components/difficulty-selector/difficulty-selector.component';
import { GameStatusHudComponent } from '../../../shared/components/game-status-hud/game-status-hud.component';
import { TimelapseModalComponent } from '../../../shared/components/timelapse-modal/timelapse-modal.component';

@Component({
  selector: 'app-nonogram',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GameToolbarComponent,
    GameLayoutComponent,
    GamePkHudComponent,
    GameHandheldHeaderComponent,
    DifficultySelectorComponent,
    GameStatusHudComponent,
    TimelapseModalComponent
  ],
  templateUrl: './nonogram.component.html',
  styleUrls: ['./nonogram.component.css'],
  providers: [NonogramStore],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NonogramComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(NonogramStore);
  coinService = inject(CoinService);
  coinGuideService = inject(CoinGuideService);
  pwaService = inject(PwaService);
  feedbackService = inject(FeedbackService);
  private elementRef = inject(ElementRef);

  private windowSize = inject(WindowSizeService);

  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;

  private roomLifecycle: RoomLifecycleHandle;

  predefinedDifficulties = this.gameRegistry.getConfig('nonogram')?.difficulties || [];

  readonly currentDifficultyLabel = computed(() => {
    const diffId = this.store.currentDifficulty();
    const item = this.predefinedDifficulties.find(d => d.id === diffId);
    if (!item) return diffId;
    const label = this.t(item.labelKey)();
    return `${label} (${item.desc || diffId})`;
  });

  getSubtitle() {
    return this.currentDifficultyLabel();
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
    if (this.store.roomId() || this.store.isSpectator() || this.store.currentRoomMode() !== GameMode.Single) return;
    this.store.currentDifficulty.set(diff);
    setSavedDifficulty('nonogram', diff);
    this.store.playAgain();
  }

  showInGameReplayModal = signal(false);

  openReplayModal() {
    this.haptic.vibrateLight();
    this.showInGameReplayModal.set(true);
  }

  closeReplayModal() {
    this.showInGameReplayModal.set(false);
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

    effect(() => {
      if (this.store.status() === GameStatus.Finished) {
        if (this.store.isVictory()) {
          this.celebrateVictory();
        } else {
          this.vibrateError();
        }
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      this.pendingResumeSession.set(null);
      this.store.joinRoom(
        pending.roomId,
        pending.mode,
        pending.difficulty,
        pending.host || '',
        pending.target ?? 1,
        pending.password,
        pending.bountyCoins,
        pending.isSpectator
      );
      return;
    } else {
      // Legacy migration: if older version saved in 'nonogram_saved_game', migrate to ResumeGameService
      if (typeof localStorage !== 'undefined') {
        const legacy = localStorage.getItem('nonogram_saved_game');
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            if (parsed?.state && parsed.state.status === GameStatus.Playing) {
              const diff = parsed.difficulty || GameDifficulty.Easy;
              this.resumeService.saveSession('nonogram', {
                difficulty: diff,
                difficultyLabel: this.resumeService.getDifficultyLabel(diff, 'nonogram'),
                progressPercent: 10,
                moves: 1,
                timeElapsed: 0,
                data: {
                  state: parsed.state,
                  difficulty: diff,
                  timeSpent: 0
                }
              });
            }
          } catch {}
          localStorage.removeItem('nonogram_saved_game');
        }
      }

      // Strictly isolate: only check or prompt resume session if purely in single-player
      if (this.store.currentRoomMode() === GameMode.Single && !this.store.isSpectator() && !this.store.roomId()) {
        const hasResume = this.checkAndPromptResumeSession('nonogram');
        if (!hasResume) {
          const initialDiff = getSavedDifficulty('nonogram', GameDifficulty.Easy);
          this.store.currentDifficulty.set(initialDiff);
          this.store.joinRoom('', GameMode.Single, initialDiff);
        }
      }
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  

  readonly hideLeftPanel = computed(() => this.store.width() > 15);

  /** Zoom Controls: 1.0 = 100% Auto-fit, 1.15 = 115%, etc. */
  zoomLevel = signal<number>(1.0);

  zoomIn() {
    this.zoomLevel.update(z => Math.min(1.6, Math.round((z + 0.15) * 100) / 100));
  }

  zoomOut() {
    this.zoomLevel.update(z => Math.max(0.7, Math.round((z - 0.15) * 100) / 100));
  }

  resetZoom() {
    this.zoomLevel.set(1.0);
  }

  /** Optimal cell size to fit 100% within available viewport without clipping */
  readonly autoFitCellSize = computed(() => {
    const w = this.store.width();
    const h = this.store.height();
    const { w: vw, h: vh } = this.windowSize.size();

    // Actual max hint length per row and column
    const rowHints: number[][] = (this.store.rowHints() as any) || [];
    const colHints: number[][] = (this.store.colHints() as any) || [];
    const maxRowHints = rowHints.length > 0 ? Math.max(...rowHints.map((r: number[]) => r.length), 1) : 1;
    const maxColHints = colHints.length > 0 ? Math.max(...colHints.map((c: number[]) => c.length), 1) : 1;

    // Available width for the board container:
    // Takes into account max-w-[1600px] desktop arena, 3-column cockpit wings, and pedestal paddings
    const isXl = vw >= 1280;
    const is2Xl = vw >= 1536;
    const isZen = this.zenService.isZenMode();

    let availW: number;
    if (isZen) {
      availW = Math.max(260, vw - 32);
    } else if (isXl) {
      // PC 3-column cockpit layout inside max-w-[1600px] arena
      const arenaW = Math.min(vw, 1600);
      const arenaPadding = is2Xl ? 64 : 48; // px-8 (64px) on 2xl, px-6 (48px) on xl
      const wingsWidth = is2Xl ? 704 : 640; // two 352px wings on 2xl, two 320px wings on xl
      const gaps = is2Xl ? 48 : 32; // gap-6 (24px * 2) on 2xl, gap-4 (16px * 2) on xl
      const centerStageW = Math.min(896, arenaW - arenaPadding - wingsWidth - gaps);
      const pedestalAndBoardPadding = 68; // p-6 (48px) + md:p-2.5 (20px)
      availW = Math.max(240, centerStageW - pedestalAndBoardPadding);
    } else {
      // Mobile / Tablet single column
      const padW = vw < 640 ? 20 : (vw < 1024 ? 40 : 64);
      availW = Math.max(240, vw - padW);
    }

    // Available height in viewport:
    const isSingle = this.store.currentRoomMode() === GameMode.Single;
    const isHandheld = this.deviceService.isHandheld();
    // Chrome height reservation:
    // Zen mode: minimal ~45px
    // Normal single player: site header (64px) + game header (48px) + mini-toolbar (28px) + pedestal padding (24px) + bottom-toolbar (60px) = ~224px
    const chromeH = isZen
      ? 45
      : (isSingle ? (isHandheld ? (vw < 640 ? 175 : 195) : 225) : (isHandheld ? (vw < 640 ? 215 : 235) : 270));
    const availH = Math.max(240, vh - chromeH);

    // Realistic pixel reservations for hint areas:
    const hintNumberPitch = w >= 20 ? 15 : 18;
    const estRowHintWidth = Math.max(38, maxRowHints * hintNumberPitch + 18);
    const availGridW = Math.max(120, availW - estRowHintWidth);

    const estColHintHeight = Math.max(34, maxColHints * 14 + 8);
    const availGridH = Math.max(120, availH - estColHintHeight);

    const sizeW = Math.floor(availGridW / w);
    const sizeH = Math.floor(availGridH / h);
    let calculatedSize = Math.min(sizeW, sizeH);

    if (vw < 640) {
      // Mobile portrait
      if (w >= 25) {
        return Math.max(16, Math.min(calculatedSize, 24));
      } else if (w >= 20) {
        return Math.max(18, Math.min(calculatedSize, 28));
      } else if (w >= 15) {
        return Math.max(22, Math.min(calculatedSize, 40));
      } else if (w >= 10) {
        return Math.max(30, Math.min(calculatedSize, 56));
      } else {
        return Math.max(48, Math.min(calculatedSize, 80));
      }
    } else {
      // Tablet and Desktop (>=640px)
      // Allow natural fit down to readable/clickable minimums:
      if (w >= 25) {
        return Math.max(16, Math.min(calculatedSize, 24));
      } else if (w >= 20) {
        return Math.max(18, Math.min(calculatedSize, 28));
      } else if (w >= 15) {
        return Math.max(22, Math.min(calculatedSize, 38));
      } else if (w >= 10) {
        return Math.max(30, Math.min(calculatedSize, 54));
      } else {
        return Math.max(48, Math.min(calculatedSize, 80));
      }
    }
  });

  readonly cellSize = computed(() => {
    const base = this.autoFitCellSize();
    const zoom = this.zoomLevel();
    if (zoom === 1.0) return base;
    return Math.max(14, Math.min(60, Math.round(base * zoom)));
  });

  /** Whether the board footprint exceeds the visible container viewport */
  readonly isBoardOverflowing = computed(() => {
    const h = this.store.height();
    const w = this.store.width();
    const cell = this.cellSize();
    const colHints: number[][] = (this.store.colHints() as any) || [];
    const rowHints: number[][] = (this.store.rowHints() as any) || [];
    const maxColHints = colHints.length > 0 ? Math.max(...colHints.map((c: number[]) => c.length), 1) : 1;
    const maxRowHints = rowHints.length > 0 ? Math.max(...rowHints.map((r: number[]) => r.length), 1) : 1;
    const estBoardH = h * cell + (maxColHints * 14 + 10);
    const hintNumberPitch = w >= 20 ? 15 : 18;
    const estBoardW = w * cell + (maxRowHints * hintNumberPitch + 18);
    const { w: vw, h: vh } = this.windowSize.size();
    const isZen = this.zenService.isZenMode();
    const isXl = vw >= 1280;
    const is2Xl = vw >= 1536;

    let availW: number;
    if (isZen) {
      availW = Math.max(260, vw - 32);
    } else if (isXl) {
      const arenaW = Math.min(vw, 1600);
      const arenaPadding = is2Xl ? 64 : 48;
      const wingsWidth = is2Xl ? 704 : 640;
      const gaps = is2Xl ? 48 : 32;
      const centerStageW = Math.min(896, arenaW - arenaPadding - wingsWidth - gaps);
      availW = Math.max(240, centerStageW - 68);
    } else {
      const padW = vw < 640 ? 20 : (vw < 1024 ? 40 : 64);
      availW = Math.max(240, vw - padW);
    }

    const chromeH = isZen ? 45 : (this.deviceService.isHandheld() ? (vw < 640 ? 175 : 195) : 225);
    const availH = Math.max(240, vh - chromeH);
    return estBoardH > availH || estBoardW > availW;
  });

  @ViewChild('cellsGrid') cellsGridRef?: ElementRef<HTMLElement>;

  /** Crosshair highlighting */
  hoverRow = signal<number | null>(null);
  hoverCol = signal<number | null>(null);

  readonly completedRowsCount = computed(() => this.store.completedRows().filter(v => v).length);
  readonly completedColsCount = computed(() => this.store.completedCols().filter(v => v).length);

  private isDragging = false;
  private activePointerId: number | null = null;
  private currentBatchId: number = 0;
  private dragTargetState: number = -1;
  private lastCoord: { x: number; y: number } | null = null;
  private startCoord: { x: number; y: number } | null = null;
  private startPointerPos: { x: number; y: number } | null = null;
  private dragAxis: 'none' | 'x' | 'y' = 'none';
  private longPressTimer: any = null;
  private isLongPressTriggered = false;
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
    if (this.store.status() !== GameStatus.Playing || this.store.isSpectator()) return;
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
    this.dragAxis = 'none';
    this.isLongPressTriggered = false;

    // Crosshair reference tracking
    this.hoverRow.set(coord.y);
    this.hoverCol.set(coord.x);

    const isRightClick = event.button === 2;
    const isTouch = event.pointerType === 'touch' || event.pointerType === 'pen' || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // ⚡ 0ms Instant Response: Paint start cell immediately without any latency!
    this.dragTargetState = this.store.determineNextState(coord.x, coord.y, isRightClick);
    this.vibrateLight();
    this.store.setCellsBatch([coord], this.dragTargetState as any, this.currentBatchId);

    // Gentle long-press (300ms) to toggle alternate mode on mobile if kept inside cell
    if (isTouch) {
      this.longPressTimer = setTimeout(() => {
        if (this.isDragging && !this.isLongPressTriggered && this.startCoord) {
          this.isLongPressTriggered = true;
          const currentCell = this.store.grid()[this.startCoord.y]?.[this.startCoord.x];
          // Toggle between Paint(1) and Cross(2)
          const altState = currentCell === 1 ? 2 : (currentCell === 2 ? 1 : 2);
          this.dragTargetState = altState;
          this.vibrateMedium();
          this.store.setCellsBatch([this.startCoord], altState as any, this.currentBatchId);
        }
      }, 300);
    }
  }

  handlePointerMove(event: PointerEvent) {
    if (this.store.isSpectator()) return;
    const rawCoord = this.getCoordFromClient(event.clientX, event.clientY);
    if (rawCoord) {
      this.hoverRow.set(rawCoord.y);
      this.hoverCol.set(rawCoord.x);
    }

    if (!this.isDragging) return;
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;

    if (event.cancelable) event.preventDefault();

    // Determine linear drag lock (horizontal vs vertical)
    // Mobile finger jitter tolerance: do NOT cancel long-press if within start cell or within 18px!
    if (this.startPointerPos && this.startCoord) {
      const dx = event.clientX - this.startPointerPos.x;
      const dy = event.clientY - this.startPointerPos.y;
      const dist = Math.hypot(dx, dy);

      const isOutsideStartCell = rawCoord && (rawCoord.x !== this.startCoord.x || rawCoord.y !== this.startCoord.y);

      // Only cancel long-press and lock drag axis if finger moved out of cell or moved significantly (> 18px)
      if (dist > 18 || isOutsideStartCell) {
        if (!this.isLongPressTriggered) {
          this.clearLongPressTimer();
        }
        if (this.dragAxis === 'none' && dist > 8) {
          this.dragAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        }
      }
    }

    if (!rawCoord || !this.startCoord) return;

    // Linear axis clamping: keep dragging strictly on the same row or column!
    let targetX = rawCoord.x;
    let targetY = rawCoord.y;
    if (this.dragAxis === 'x') {
      targetY = this.startCoord.y;
    } else if (this.dragAxis === 'y') {
      targetX = this.startCoord.x;
    }

    const clampedCoord = { x: targetX, y: targetY };
    this.hoverRow.set(clampedCoord.y);
    this.hoverCol.set(clampedCoord.x);

    if (this.lastCoord) {
      if (this.lastCoord.x === clampedCoord.x && this.lastCoord.y === clampedCoord.y) {
        return;
      }
      const lineCells = this.getLineCells(this.lastCoord.x, this.lastCoord.y, clampedCoord.x, clampedCoord.y);
      if (lineCells.length > 0 && this.dragTargetState !== -1) {
        this.store.setCellsBatch(lineCells, this.dragTargetState as any, this.currentBatchId);
      }
    } else {
      if (this.dragTargetState !== -1) {
        this.store.setCellsBatch([clampedCoord], this.dragTargetState as any, this.currentBatchId);
      }
    }

    this.lastCoord = clampedCoord;
  }

  handlePointerUp(event: PointerEvent) {
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
    this.clearLongPressTimer();
    this.endDrag(event);
  }

  handlePointerCancel(event: PointerEvent) {
    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) return;
    this.clearLongPressTimer();
    this.endDrag(event);
  }

  handleMouseLeave() {
    if (!this.isDragging) {
      this.hoverRow.set(null);
      this.hoverCol.set(null);
    }
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
    this.dragAxis = 'none';
    this.isLongPressTriggered = false;
    this.dragTargetState = -1;
    this.pointerHandled = false;
  }

  handleTouchFallbackStart(event: TouchEvent) {
    if (this.pointerHandled || this.store.status() !== GameStatus.Playing || this.store.isSpectator()) return;
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
    this.dragAxis = 'none';
    this.isLongPressTriggered = false;

    this.hoverRow.set(coord.y);
    this.hoverCol.set(coord.x);

    // 0ms instant response on touch
    this.dragTargetState = this.store.determineNextState(coord.x, coord.y, false);
    this.store.setCellsBatch([coord], this.dragTargetState as any, this.currentBatchId);

    this.longPressTimer = setTimeout(() => {
      if (this.isDragging && !this.isLongPressTriggered && this.startCoord) {
        this.isLongPressTriggered = true;
        const currentCell = this.store.grid()[this.startCoord.y]?.[this.startCoord.x];
        const altState = currentCell === 1 ? 2 : (currentCell === 2 ? 1 : 2);
        this.dragTargetState = altState;
        this.vibrateMedium();
        this.store.setCellsBatch([this.startCoord], altState as any, this.currentBatchId);
      }
    }, 300);
  }

  handleTouchFallbackMove(event: TouchEvent) {
    if (this.pointerHandled || !this.isDragging || event.touches.length === 0) return;
    if (event.cancelable) event.preventDefault();

    const touch = event.touches[0];
    const rawCoord = this.getCoordFromClient(touch.clientX, touch.clientY);

    if (this.startPointerPos && this.startCoord) {
      const dx = touch.clientX - this.startPointerPos.x;
      const dy = touch.clientY - this.startPointerPos.y;
      const dist = Math.hypot(dx, dy);

      const isOutsideStartCell = rawCoord && (rawCoord.x !== this.startCoord.x || rawCoord.y !== this.startCoord.y);

      if (dist > 18 || isOutsideStartCell) {
        if (!this.isLongPressTriggered) {
          this.clearLongPressTimer();
        }
        if (this.dragAxis === 'none' && dist > 8) {
          this.dragAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        }
      }
    }

    if (!rawCoord || !this.startCoord) return;

    let targetX = rawCoord.x;
    let targetY = rawCoord.y;
    if (this.dragAxis === 'x') targetY = this.startCoord.y;
    else if (this.dragAxis === 'y') targetX = this.startCoord.x;

    const clampedCoord = { x: targetX, y: targetY };
    this.hoverRow.set(clampedCoord.y);
    this.hoverCol.set(clampedCoord.x);

    if (this.lastCoord) {
      if (this.lastCoord.x === clampedCoord.x && this.lastCoord.y === clampedCoord.y) return;
      const lineCells = this.getLineCells(this.lastCoord.x, this.lastCoord.y, clampedCoord.x, clampedCoord.y);
      if (lineCells.length > 0 && this.dragTargetState !== -1) {
        this.store.setCellsBatch(lineCells, this.dragTargetState as any, this.currentBatchId);
      }
    }
    this.lastCoord = clampedCoord;
  }

  handleTouchFallbackEnd() {
    if (this.pointerHandled) return;
    this.clearLongPressTimer();
    this.isDragging = false;
    this.lastCoord = null;
    this.startCoord = null;
    this.startPointerPos = null;
    this.dragAxis = 'none';
    this.isLongPressTriggered = false;
    this.dragTargetState = -1;
  }

  useHint() {
    this.store.useHint();
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

    const isSpec = this.store.isSpectator();
    return players
      .filter(p => p && (isSpec || p.id !== myId))
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

  override handleRestart() {
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

    // Zoom Controls hotkeys (+, -, 0)
    if ((event.key === '+' || event.key === '=') && !event.ctrlKey && !event.metaKey) {
      this.zoomIn();
      event.preventDefault();
      return;
    }
    if ((event.key === '-' || event.key === '_') && !event.ctrlKey && !event.metaKey) {
      this.zoomOut();
      event.preventDefault();
      return;
    }
    if (event.key === '0' && !event.ctrlKey && !event.metaKey) {
      this.resetZoom();
      event.preventDefault();
      return;
    }
  }

  override handleDismissRoom() {
    this.dismissRoom();
  }
}
