import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal, HostListener, HostBinding } from '@angular/core';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { AuthStore } from '../../../core/auth/auth.store';
import { BlockStore } from './store/block.store';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { CommonModule } from '@angular/common';
import { BlockShape } from './utils/shapes';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';

@Component({
  selector: 'app-block',
  standalone: true,
  imports: [
    CommonModule, 
    GameLobbyPanelComponent,
    GameHeaderComponent,
    GameWaitingRoomComponent,
    GameResultOverlayComponent,
    GameStartingOverlayComponent,
    GameRulesModalComponent,
    PlayerBadgeComponent
  ],
  templateUrl: './block.component.html',
})
export class BlockComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(BlockStore);
  private authStore = inject(AuthStore);
  private crossGameJoin = inject(CrossGameJoinService);
  gameRegistry = inject(GameRegistryService);
  i18n = inject(I18nService);

  @HostBinding('class') override get hostClass() { return 'block h-full w-full'; }

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;
  @ViewChild('boardElement') boardElement?: ElementRef<HTMLElement>;

  // Preview overlay for drop
  previewShadow = signal<{ row: number, col: number, shape: BlockShape } | null>(null);
  
  showRules = signal(false);

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  private roomLifecycle!: RoomLifecycleHandle;

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'block',
      getCurrentMode: () => this.store.currentMode(),
      onLeaveRoom: () => {
        this.store.leaveGame();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();
    
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      if (pending.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      if (!this.roomId() || this.roomId() === 'local') {
        this.store.joinRoom('local', 'single', 'medium', this.playerId);
      }
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

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.store.leaveGame();
  }

  getModeName() {
    const mode = this.store.currentMode();
    const key = this.gameRegistry.getModeLabel('block', mode);
    return key ? this.i18n.t(key as string)() : mode;
  }

  returnToLobby(): void {
    this.store.leaveGame();
  }

  goBack(): void {
    if (this.roomId() && this.roomId() !== 'local') {
      this.store.leaveGame();
    }
    history.back();
  }

  getDifficultyName() {
    const diff = this.currentDifficulty();
    const key = this.gameRegistry.getDifficultyLabel('block', diff);
    return key ? this.i18n.t(key as string)() : diff;
  }

  openChangeSettings() {
    if (this.lobbyPanel && this.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.roomId(),
        game: 'block',
        mode: this.currentRoomMode(),
        difficulty: this.currentDifficulty(),
        host: this.hostId()
      });
    }
  }

  changeSingleDifficulty(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.handleJoinRoom({
      roomId: 'local', 
      mode: 'single', 
      difficulty: select.value, 
      host: this.playerId
    });
  }

  roomId() { return this.store.roomId(); }
  currentRoomMode() { return this.store.currentMode(); }
  currentDifficulty() { return this.store.currentDifficulty(); }
  hostId() { return this.store.hostId(); }

  get isWin(): boolean {
    if (this.store.currentMode() === 'single') return false;
    return this.store.rawState()?.winners?.includes(this.playerId) || false;
  }

  get resultStatus(): 'win' | 'lose' {
    if (this.store.currentMode() === 'single') return 'lose'; // Survival always ends in loss
    return this.isWin ? 'win' : 'lose';
  }

  get resultTitle(): string {
    if (this.store.currentMode() === 'single') return this.i18n.t('game.game_over')();
    return this.isWin ? this.i18n.t('game.you_win')() : this.i18n.t('game.you_lose')();
  }

  get resultStats() {
    return [
      { label: this.i18n.t('block.score')() || 'SCORE', value: this.store.score() }
    ];
  }

  getOpponentScore(oppId: string): number {
    return this.store.rawState()?.players[oppId]?.score || 0;
  }

  getOpponentStatus(oppId: string): 'playing' | 'finished' {
    return this.store.rawState()?.players[oppId]?.finished ? 'finished' : 'playing';
  }

  // --- Drag and Drop Logic ---
  
  isDragging = false;
  draggedShape: BlockShape | null = null;
  draggedIndex: number = -1;
  dragPos = { x: 0, y: 0 };
  dragStartOffset = { x: 0, y: 0 };
  dragCellSize = 48;
  dragCellGap = 4;

  onDragStart(event: MouseEvent | TouchEvent, shape: BlockShape, index: number) {
    if (this.store.status() !== 'playing' || this.store.isDead()) return;
    
    // Prevent default to avoid scrolling on touch devices
    if (event.cancelable) {
      event.preventDefault();
    }

    this.isDragging = true;
    this.draggedShape = shape;
    this.draggedIndex = index;

    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : (event as MouseEvent).clientY;

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
    
    // We want the piece to be vertically completely above the finger, and shifted slightly left
    const fingerOffsetY = isTouch ? (shapeHeight + 40) : (shapeHeight / 2);
    const fingerOffsetX = isTouch ? (shapeWidth / 2 + 20) : (shapeWidth / 2);

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
    
    const fingerOffsetY = isTouch ? (shapeHeight + 40) : (shapeHeight / 2);
    const fingerOffsetX = isTouch ? (shapeWidth / 2 + 20) : (shapeWidth / 2);

    const pieceTopLeftX = this.dragPos.x - fingerOffsetX;
    const pieceTopLeftY = this.dragPos.y - fingerOffsetY;

    // Convert to board coordinates
    const localX = pieceTopLeftX - boardRect.left;
    const localY = pieceTopLeftY - boardRect.top;

    const col = Math.round((localX - 4) / cellStepX);
    const row = Math.round((localY - 4) / cellStepY);

    // Provide visual preview if it fits
    if (this.store.canPlace(this.draggedShape, row, col, this.store.board())) {
      this.previewShadow.set({ row, col, shape: this.draggedShape });
    } else {
      this.previewShadow.set(null);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  @HostListener('document:touchend', ['$event'])
  onDragEnd(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;

    if (this.previewShadow()) {
      const { row, col } = this.previewShadow()!;
      this.store.placeShape(this.draggedIndex, row, col);
    }

    this.isDragging = false;
    this.draggedShape = null;
    this.draggedIndex = -1;
    this.previewShadow.set(null);
  }
}
