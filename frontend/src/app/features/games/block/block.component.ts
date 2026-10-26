import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { AdService } from '../../../core/services/ad.service';
import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal, HostListener, HostBinding, effect, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { AuthStore } from '../../../core/auth/auth.store';
import { BlockStore } from './store/block.store';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { CommonModule } from '@angular/common';
import { BlockShape } from './utils/shapes';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { GamePkHudComponent } from '../../../shared/components/game-pk-hud/game-pk-hud.component';
import { PkPlayerStats } from '../../../shared/components/game-pk-hud/game-pk-hud.model';
import { HapticService } from '../../../core/services/haptic.service';
import { GameScoreCapsuleComponent } from '../../../shared/components/game-score-capsule/game-score-capsule.component';
import { LeaderboardService } from '../../../core/services/leaderboard.service';


@Component({
  selector: 'app-block',
  standalone: true,
  imports: [GameSpectatingOverlayComponent, 
    CommonModule,
    GameLayoutComponent,
    GamePkHudComponent,
    GameScoreCapsuleComponent],
  templateUrl: './block.component.html',
  styles: [`
    @keyframes block-shake {
      0%, 100% { transform: translate3d(0, 0, 0); }
      14%  { transform: translate3d(-5px, 2px, 0) rotate(-0.4deg); }
      28%  { transform: translate3d(5px, -2px, 0) rotate(0.4deg); }
      42%  { transform: translate3d(-4px, 1px, 0); }
      56%  { transform: translate3d(4px, -1px, 0); }
      70%  { transform: translate3d(-2px, 1px, 0); }
    }
    .block-shake { animation: block-shake 0.4s cubic-bezier(.36,.07,.19,.97); }

    /* Score float-up */
    @keyframes block-score-float {
      0%   { transform: translateX(-50%) translateY(0)      scale(0.6); opacity: 0; }
      14%  { transform: translateX(-50%) translateY(-18px)  scale(1.25); opacity: 1; }
      100% { transform: translateX(-50%) translateY(-100px) scale(0.9); opacity: 0; }
    }
    .block-score-float { animation: block-score-float 1.2s ease-out forwards; }

    /* Spark particles — enhanced with incandescent glow trail */
    .block-spark { animation: block-spark 0.85s cubic-bezier(0.1, 1, 0.3, 1) forwards; }
    @keyframes block-spark {
      0%   { transform: translate(0, 0) scale(1.8); opacity: 1; filter: blur(0px) brightness(2.5); }
      40%  { opacity: 1; filter: blur(0.5px) brightness(1.8); }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; filter: blur(1.5px) brightness(1); }
    }
  `]
})
export class BlockComponent extends BaseGameComponent implements OnInit, OnDestroy {
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

  readonly myPlayerPkStats = computed<PkPlayerStats>(() => {
    return {
      playerId: this.playerId,
      nickname: this.authStore.currentUser()?.nickname || this.playerId,
      avatar: this.authStore.currentUser()?.avatar,
      isHost: this.playerId === this.store.hostId(),
      isMe: true,
      score: this.store.score(),
      status: this.store.status() === GameStatus.Finished ? GameStatus.Finished : GameStatus.Playing,
      metrics: [
        { label: this.i18n.t('game.pk.score')(), value: this.store.score(), icon: '⭐', colorClass: 'text-amber-500 font-bold' }
      ]
    };
  });

  readonly opponentsPkStats = computed<PkPlayerStats[]>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return [];
    const room = this.store.room();
    const rawPlayers = room?.players;
    const players: any[] = Array.isArray(rawPlayers)
      ? rawPlayers
      : (rawPlayers && typeof rawPlayers === 'object' ? Object.values(rawPlayers) : []);

    return this.store.playersList()
      .filter(p => p.id !== this.playerId)
      .map(p => {
        const pInfo = players.find((x: any) => x && (x.id === p.id || x.playerId === p.id));
        const oppScore = this.getOpponentScore(p.id);
        const oppStatus = this.getOpponentStatus(p.id);
        return {
          id: p.id,
          playerId: p.id,
          nickname: pInfo?.nickname || p.id,
          avatar: pInfo?.avatar,
          isHost: p.id === this.store.hostId(),
          isMe: false,
          score: oppScore,
          status: oppStatus === GameStatus.Finished ? GameStatus.Finished : GameStatus.Playing,
          metrics: [
            { label: this.i18n.t('game.pk.score')(), value: oppScore, icon: '⭐', colorClass: 'text-amber-500 font-bold' }
          ]
        };
      });
  });

  readonly seriesScore = computed<{ me: number; opponent: number } | undefined>(() => {
    if (this.store.currentRoomMode() === GameMode.Single) return undefined;
    const oppId = this.opponentsPkStats()[0]?.playerId;
    if (!oppId) return undefined;
    const wins = this.store.pkWins();
    return {
      me: wins[this.playerId] || 0,
      opponent: wins[oppId] || 0
    };
  });

  getSubtitle(): string {
    const mode = this.store.currentRoomMode();
    if (mode === GameMode.Single) {
      return this.i18n.t('game.single_mode')();
    }
    const labelKey = this.gameRegistry.getModeLabel('block', mode);
    return labelKey ? this.i18n.t(labelKey)() : this.i18n.t('game.diff_pk_score_label')();
  }

  adService = inject(AdService);
  override store = inject(BlockStore);

  worldRecord = signal<{ bestScore: number; username: string } | null>(null);
  
  @HostBinding('class') override get hostClass() { return 'block h-full w-full'; }

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;
  @ViewChild('boardElement') boardElement?: ElementRef<HTMLElement>;

  // Preview overlay for drop
  previewShadow = signal<{ row: number, col: number, shape: BlockShape } | null>(null);
  selectedHandIndex = signal<number | null>(null);
  keyboardCursor = signal<{ row: number; col: number }>({ row: 4, col: 4 });
  
  isShaking = signal(false);
  floatItems = signal<{ id: number; text: string; tier: 1 | 2 | 3; xPct: number }[]>([]);
  particles = signal<{ id: string; color: string; size: number; tx: number; ty: number }[]>([]);

  private roomLifecycle!: RoomLifecycleHandle;

  currentRoomId = computed(() => this.wsService.gameState()?.roomId || '');

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'block',
      getCurrentMode: () => this.store.currentRoomMode(),
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
      const gain = this.store.lastScoreGain();
      if (!gain) return;

      const tier: 1 | 2 | 3 = (gain.isAllClear || gain.lines >= 4 || (gain.combo && gain.combo >= 3)) ? 3 : gain.lines >= 2 ? 2 : 1;
      let text = `✨ CLEAR! +${gain.score}`;
      if (gain.isAllClear) {
        text = `🌟 PERFECT BOARD CLEAR! +${gain.score}`;
      } else if (gain.lines >= 5) {
        text = `👑 UNBELIEVABLE! +${gain.score}`;
      } else if (gain.lines === 4) {
        text = `👑 BLOCK MASTER! +${gain.score}`;
      } else if (gain.lines === 3) {
        text = `💥 TRIPLE CRUSH! +${gain.score}`;
      } else if (gain.lines === 2) {
        text = `⚡ DOUBLE CLEAR! +${gain.score}`;
      } else if (gain.combo && gain.combo > 1) {
        text = `🔥 COMBO ×${gain.combo}  +${gain.score}`;
      }

      const item = { id: gain.ts, text, tier, xPct: 35 + Math.random() * 30 };
      this.floatItems.update(items => [...items, item]);
      setTimeout(() => this.floatItems.update(items => items.filter(i => i.id !== item.id)), 1250);

      // 全屏爆裂星芒火花
      const colors = ['#fde047', '#fbbf24', '#f59e0b', '#38bdf8', '#c084fc', '#34d399', '#ffffff'];
      const count = gain.lines >= 4 ? 36 : gain.lines >= 2 ? 26 : 18;
      const sparks = Array.from({ length: count }, (_, i) => ({
        id: `${gain.ts}-${i}`,
        color: colors[i % colors.length],
        size: 5 + Math.random() * 10,
        tx: Math.random() * 360 - 180,
        ty: Math.random() * 360 - 180,
      }));
      this.particles.update(p => [...p, ...sparks]);
      setTimeout(() => this.particles.update(p => p.filter(x => !x.id.startsWith(`${gain.ts}-`))), 950);
    });

    effect((onCleanup) => {
      if (this.store.status() === GameStatus.Finished) {
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.showOverlay.set(false);
      }
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();

    this.leaderboardService.getWorldRecord('block').subscribe(rec => {
      if (rec) this.worldRecord.set(rec);
    });
    
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '', pending.target ?? 1);
      if (pending.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      if (!this.currentRoomId()) {
        const savedDiff = getSavedDifficulty('block', GameDifficulty.Medium);
        this.store.joinRoom('', GameMode.Single, savedDiff, this.playerId);
      }
    }  }


  override handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string}) {
    super.handleCreateRoom(event);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(this.currentRoomId() || event.name, event.mode, event.difficulty, this.playerId);
    }
  }

  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string; password?: string }) {
    super.handleJoinRoom(params);
    if (params.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
  }


  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  getModeName() {
    const mode = this.store.currentRoomMode();
    const key = this.gameRegistry.getModeLabel('block', mode);
    return key ? this.i18n.t(key as string)() : mode;
  }



  getDifficultyName() {
    const diff = this.store.currentDifficulty();
    const key = this.gameRegistry.getDifficultyLabel('block', diff);
    return key ? this.i18n.t(key as string)() : diff;
  }

  override openChangeSettings() {
    if (this.lobbyPanel && this.currentRoomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.currentRoomId(),
        game: 'block',
        mode: this.store.currentRoomMode(),
        difficulty: this.store.currentDifficulty(),
        host: this.store.hostId()
      });
    }
  }

  changeSingleDifficulty(diff: string) {
    setSavedDifficulty('block', diff);
    this.store.joinRoom('', GameMode.Single, diff, this.playerId);
  }

  get isWin(): boolean {
    if (this.store.currentRoomMode() === GameMode.Single) return false;
    return this.store.winners().includes(this.playerId) || false;
  }

  get resultStatus(): 'win' | 'lose' {
    if (this.store.currentRoomMode() === GameMode.Single) return 'lose';
    return this.isWin ? 'win' : 'lose';
  }

  get resultTitle(): string {
    if (this.store.currentRoomMode() === GameMode.Single) return this.i18n.t('game.game_over')();
    return this.isWin ? this.i18n.t('game.you_win')() : this.i18n.t('game.you_lose')();
  }

  get resultStats() {
    return [
      { label: this.i18n.t('block.score')() || 'SCORE', value: this.store.score() }
    ];
  }

  getOpponentScore(oppId: string): number {
    return (this.store as any).rawState()?.players[oppId]?.score || 0;
  }

  getOpponentStatus(oppId: string): 'playing' | 'finished' {
    return (this.store as any).rawState()?.players[oppId]?.finished ? GameStatus.Finished : 'playing';
  }

  // --- Drag and Drop Logic ---
  
  isDragging = false;
  draggedShape: BlockShape | null = null;
  draggedIndex: number = -1;
  dragPos = { x: 0, y: 0 };
  dragStartOffset = { x: 0, y: 0 };
  dragCellSize = 48;
  dragCellGap = 4;
  private dragStartPos = { x: 0, y: 0 };
  private dragHasMoved = false;
  private lastSnapPos: { row: number; col: number } | null = null;

  selectHandSlot(index: number) {
    if (this.store.status() !== GameStatus.Playing || this.store.isDead()) return;
    const shape = this.store.hand()[index];
    if (!shape) return;

    if (this.selectedHandIndex() === index) {
      this.selectedHandIndex.set(null);
      this.previewShadow.set(null);
      this.audioService.playBlock('pickup');
    } else {
      this.selectedHandIndex.set(index);
      this.audioService.playBlock('pickup');
      this.haptic.vibrateLight();
      this.updatePreviewForSelected(this.keyboardCursor().row, this.keyboardCursor().col);
    }
  }

  onCellHover(row: number, col: number) {
    this.keyboardCursor.set({ row, col });
    if (this.isDragging) return;
    if (this.selectedHandIndex() !== null) {
      this.updatePreviewForSelected(row, col);
    }
  }

  onCellClick(row: number, col: number) {
    const handIdx = this.selectedHandIndex();
    if (handIdx === null) return;
    const shape = this.store.hand()[handIdx];
    if (!shape) {
      this.selectedHandIndex.set(null);
      this.previewShadow.set(null);
      return;
    }

    if (this.store.canPlace(shape, row, col, this.store.board())) {
      this.store.placeShape(handIdx, row, col);
      this.haptic.vibrateSnap();
      this.selectedHandIndex.set(null);
      this.previewShadow.set(null);
    } else {
      this.audioService.playBlock('error');
      this.haptic.vibrateLight();
    }
  }

  private updatePreviewForSelected(row: number, col: number) {
    const handIdx = this.selectedHandIndex();
    if (handIdx === null) {
      this.previewShadow.set(null);
      return;
    }
    const shape = this.store.hand()[handIdx];
    if (!shape) {
      this.previewShadow.set(null);
      return;
    }
    if (this.store.canPlace(shape, row, col, this.store.board())) {
      this.previewShadow.set({ row, col, shape });
    } else {
      this.previewShadow.set(null);
    }
  }

  onDragStart(event: MouseEvent | TouchEvent, shape: BlockShape, index: number) {
    if (this.store.status() !== GameStatus.Playing || this.store.isDead()) return;

    this.audioService.initAudio(); // fire-and-forget
    this.audioService.playBlock('pickup');

    // Prevent default to avoid scrolling on touch devices
    if (event.cancelable) {
      event.preventDefault();
    }

    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : (event as MouseEvent).clientY;

    this.isDragging = true;
    this.draggedShape = shape;
    this.draggedIndex = index;
    this.dragStartPos = { x: clientX, y: clientY };
    this.dragHasMoved = false;
    this.haptic.vibrateLight();

    const isTouch = 'touches' in event || event.type.startsWith('touch');
    
    let cellRenderSize = 48;
    let cellGap = 4;

    if (this.boardElement) {
      const boardRect = this.boardElement.nativeElement.getBoundingClientRect();
      const boardSize = this.store.boardSize();
      const totalGapWidth = (boardSize - 1) * 4;
      const totalPadding = 8;
      const availableWidth = boardRect.width - totalGapWidth - totalPadding;
      cellRenderSize = availableWidth / boardSize;
      cellGap = 4;
    } else {
      cellRenderSize = isTouch ? 40 : 48;
    }

    this.dragCellSize = cellRenderSize;
    this.dragCellGap = cellGap;

    const shapeCols = shape.matrix[0].length;
    const shapeRows = shape.matrix.length;
    
    const shapeWidth = shapeCols * cellRenderSize + (shapeCols - 1) * cellGap;
    const shapeHeight = shapeRows * cellRenderSize + (shapeRows - 1) * cellGap;
    
    // We want the piece to float in the top-left quadrant of the finger on touch so thumb never occludes it
    const fingerOffsetY = isTouch ? (shapeHeight + 36) : (shapeHeight / 2);
    const fingerOffsetX = isTouch ? (shapeWidth + 14) : (shapeWidth / 2);

    this.lastSnapPos = null;

    // We set dragStartOffset so that the top-left of the dragged div is exactly at `pointer - fingerOffset`.
    this.dragStartOffset = {
      x: fingerOffsetX,
      y: fingerOffsetY
    };

    this.dragPos = {
      x: clientX,
      y: clientY
    };
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onDragMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging || !this.draggedShape) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : (event as MouseEvent).clientY;

    if (!this.dragHasMoved && Math.hypot(clientX - this.dragStartPos.x, clientY - this.dragStartPos.y) > 8) {
      this.dragHasMoved = true;
    }

    this.dragPos = {
      x: clientX,
      y: clientY
    };

    if (!this.boardElement) return;

    const boardRect = this.boardElement.nativeElement.getBoundingClientRect();
    const cellStepX = (boardRect.width - 4) / this.store.boardSize();
    const cellStepY = (boardRect.height - 4) / this.store.boardSize();
    
    // The top-left of the shape visually
    const isTouch = 'touches' in event || event.type.startsWith('touch');
    
    const shapeCols = this.draggedShape.matrix[0].length;
    const shapeRows = this.draggedShape.matrix.length;
    const cellRenderSize = cellStepX; // visually same as board
    const cellGap = 4;
    
    const shapeWidth = shapeCols * cellRenderSize + (shapeCols - 1) * cellGap;
    const shapeHeight = shapeRows * cellRenderSize + (shapeRows - 1) * cellGap;
    
    const fingerOffsetY = isTouch ? (shapeHeight + 36) : (shapeHeight / 2);
    const fingerOffsetX = isTouch ? (shapeWidth + 14) : (shapeWidth / 2);

    const pieceTopLeftX = this.dragPos.x - fingerOffsetX;
    const pieceTopLeftY = this.dragPos.y - fingerOffsetY;

    const localX = pieceTopLeftX - boardRect.left;
    const localY = pieceTopLeftY - boardRect.top;

    // Convert to floating board coordinates
    const exactCol = (localX - 4) / cellStepX;
    const exactRow = (localY - 4) / cellStepY;

    const baseCol = Math.round(exactCol);
    const baseRow = Math.round(exactRow);

    // Magnetic search: find the nearest valid slot with high fault tolerance
    let snappedSlot: { row: number; col: number } | null = null;

    // Check direct slot first
    if (this.store.canPlace(this.draggedShape, baseRow, baseCol, this.store.board())) {
      snappedSlot = { row: baseRow, col: baseCol };
    } else {
      // Expanded magnetic snap: search surrounding neighbors within ~1.65 cell distance
      let minDistance = 1.65;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = baseRow + dr;
          const nc = baseCol + dc;
          const dist = Math.hypot(exactRow - nr, exactCol - nc);
          if (dist < minDistance && this.store.canPlace(this.draggedShape, nr, nc, this.store.board())) {
            minDistance = dist;
            snappedSlot = { row: nr, col: nc };
          }
        }
      }
    }

    // Provide visual preview with tactile magnetic snap if a valid slot is found
    if (snappedSlot) {
      const { row, col } = snappedSlot;
      if (!this.lastSnapPos || this.lastSnapPos.row !== row || this.lastSnapPos.col !== col) {
        this.haptic.vibrateLight();
        this.lastSnapPos = { row, col };
      }
      this.previewShadow.set({ row, col, shape: this.draggedShape });
    } else {
      this.lastSnapPos = null;
      this.previewShadow.set(null);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  @HostListener('document:touchend', ['$event'])
  onDragEnd(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;

    if (!this.dragHasMoved) {
      // User tapped or clicked without dragging: toggle selection of this hand slot
      const idx = this.draggedIndex;
      this.isDragging = false;
      this.draggedShape = null;
      this.draggedIndex = -1;
      this.lastSnapPos = null;
      this.previewShadow.set(null);
      this.selectHandSlot(idx);
      return;
    }

    if (this.previewShadow()) {
      const { row, col } = this.previewShadow()!;
      this.store.placeShape(this.draggedIndex, row, col);
      this.haptic.vibrateSnap();
      this.selectedHandIndex.set(null);
    } else {
      this.audioService.playBlock('error');
    }

    this.isDragging = false;
    this.draggedShape = null;
    this.draggedIndex = -1;
    this.lastSnapPos = null;
    this.previewShadow.set(null);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    if (event.key.toLowerCase() === 'r' && this.store.currentRoomMode() === GameMode.Single) {
      this.store.startGame();
      event.preventDefault();
      return;
    }

    // Number keys 1, 2, 3 to select hand slot
    if (['1', '2', '3'].includes(event.key)) {
      const slotIdx = parseInt(event.key, 10) - 1;
      this.selectHandSlot(slotIdx);
      event.preventDefault();
      return;
    }

    // Escape to cancel selection
    if (event.key === 'Escape') {
      if (this.selectedHandIndex() !== null) {
        this.selectedHandIndex.set(null);
        this.previewShadow.set(null);
        event.preventDefault();
        return;
      }
    }

    // Arrow keys / WASD to move cursor
    const boardSize = this.store.boardSize();
    const cursor = { ...this.keyboardCursor() };
    let moved = false;

    if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
      cursor.row = Math.max(0, cursor.row - 1);
      moved = true;
    } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
      cursor.row = Math.min(boardSize - 1, cursor.row + 1);
      moved = true;
    } else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
      cursor.col = Math.max(0, cursor.col - 1);
      moved = true;
    } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
      cursor.col = Math.min(boardSize - 1, cursor.col + 1);
      moved = true;
    }

    if (moved) {
      this.keyboardCursor.set(cursor);
      if (this.selectedHandIndex() !== null) {
        this.updatePreviewForSelected(cursor.row, cursor.col);
      }
      event.preventDefault();
      return;
    }

    // Space / Enter to place shape
    if (event.key === ' ' || event.key === 'Enter') {
      if (this.selectedHandIndex() !== null) {
        this.onCellClick(cursor.row, cursor.col);
        event.preventDefault();
        return;
      }
    }
  }
}
