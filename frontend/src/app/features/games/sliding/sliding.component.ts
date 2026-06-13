import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { Component, computed, inject, signal, effect, untracked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { SlidingStore, GameStatus } from './store/sliding.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../core/services/toast.service';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent, GameMode, GameDifficulty } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { PlayerListContainerComponent } from '../../../shared/components/player-list-container/player-list-container.component';
import { HintButtonComponent } from '../../../shared/components/hint-button/hint-button.component';
import { SlidingTutorialComponent } from './components/sliding-tutorial/sliding-tutorial.component';

@Component({
  selector: 'app-sliding',
  standalone: true,
  imports: [CommonModule, FormsModule, GameWaitingRoomComponent, GameLobbyPanelComponent, GameResultOverlayComponent, GameRulesModalComponent, GameHeaderComponent, GameStartingOverlayComponent, PlayerBadgeComponent, PlayerListContainerComponent, HintButtonComponent, SlidingTutorialComponent],
  providers: [SlidingStore],
  templateUrl: './sliding.component.html',
  styleUrls: ['./sliding.component.scss']
})
export class SlidingComponent extends BaseGameComponent {
  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;
  override store = inject(SlidingStore);
  private authStore = inject(AuthStore);
  private router = inject(Router);
  readonly i18n = inject(I18nService);
  private toastService = inject(ToastService);
  private crossGameJoin = inject(CrossGameJoinService);
  private gameRegistry = inject(GameRegistryService);

  showRules = signal<boolean>(false);
  isMenuOpen = signal<boolean>(false);
  showOverlay = signal<boolean>(false);
  showTutorial = signal<boolean>(false);
  hintTarget = signal<number | null>(null);
  Math = Math;

  get difficulties() {
    return this.gameRegistry.getConfig('sliding')?.difficulties || [];
  }

  private timerInterval: any;
  currentTime = signal<number>(Date.now());
  finishedAt = signal<number | null>(null);
  
  private roomLifecycle: RoomLifecycleHandle;

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  get t() {
    return this.i18n.t.bind(this.i18n);
  }

  currentRoomMode = this.store.currentRoomMode;
  roomId = this.store.roomId;

  // For Absolute Positioning Animation
  // Returns an array of objects representing tiles 1 to size*size-1, plus 0
  tiles = computed(() => {
    const board = this.store.myBoard();
    if (!board) return [];
    
    const size = board.size;
    const cells = board.cells;
    const tileObjects = [];
    
    for (let val = 1; val < size * size; val++) {
      const idx = cells.indexOf(val);
      const row = Math.floor(idx / size);
      const col = idx % size;
      tileObjects.push({ val, row, col, size });
    }
    
    return tileObjects;
  });
  
  emptyCell = computed(() => {
    const board = this.store.myBoard();
    if (!board) return null;
    const size = board.size;
    const idx = board.emptyIdx;
    return { row: Math.floor(idx / size), col: idx % size, size };
  });

  constructor() {
    super();

    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'sliding',
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => this.returnToLobby(),
    });

    effect(() => {
      const dc = this.wsService.unexpectedDisconnectEvent();
      if (dc > 0) {
        untracked(() => {
          this.toastService.show(this.t('game.disconnect_reconnecting')(), 'error');
        });
      }
    });

    effect((onCleanup) => {
      const status = this.store.status();
      if (status === GameStatus.Finished) {
        if (!this.finishedAt()) {
          this.finishedAt.set(Date.now());
        }
        const timer = setTimeout(() => this.showOverlay.set(true), 1500);
        onCleanup(() => clearTimeout(timer));
      } else {
        this.finishedAt.set(null);
        this.showOverlay.set(false);
      }
    });

    effect(() => {
      const status = this.store.status();
      if (status === GameStatus.Starting) {
        untracked(() => this.gameTimer.startCountdown());
      } else {
        untracked(() => this.gameTimer.stopCountdown());
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit(); // connects lobby WS
    const pending = this.roomLifecycle.consumePendingOrReconnect();
    if (pending) {
      if (pending.password) this.wsService.setPendingPassword(pending.password);
      this.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      return;
    } else {
      this.store.joinGame('', this.playerId, 'single');
    }


    this.timerInterval = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 100);
  }

  override ngOnDestroy() {
    this.store.leaveGame();
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  goBack() {
    if (this.roomId()) {
      if (this.store.hostId() === this.playerId) {
        this.dismissRoom();
      } else {
        this.store.leaveGame();
      }
    }
    this.router.navigate(['/lobby']);
  }

  returnToLobby() {
    this.roomId.set('');
    this.store.leaveRoom();
    this.roomLifecycle.clearReconnectInfo();
    setTimeout(() => this.changeSingleDifficulty('medium'), 100);
  }

  dismissRoom() {
    this.toastService.confirm({
      title: this.i18n.t('game.dismiss_title')(),
      message: this.i18n.t('game.dismiss_msg')(),
      confirmText: this.i18n.t('game.dismiss_confirm')(),
      cancelText: this.i18n.t('game.cancel')(),
      onConfirm: () => {
        this.store.dismissRoom();
        this.toastService.show(this.i18n.t('game.dismiss_success')(), 'success');
      }
    });
  }

  openChangeSettings() {
    if (this.lobbyPanel && this.roomId()) {
      this.isMenuOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.roomId(),
        game: 'sliding',
        mode: this.currentRoomMode(),
        difficulty: this.store.currentDifficulty(),
        host: this.store.hostId()
      });
    }
  }

  changeSingleDifficulty(diff: string) {
    if (this.roomId()) return;
    this.store.currentDifficulty.set(diff);
    this.store.playAgain();
  }

  changeDifficulty(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.changeSingleDifficulty(target.value);
    }
  }

  joinRoom(roomId: string, mode: string, difficulty: string, hostId: string) {
    this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, hostId);
    this.store.joinGame(roomId, this.playerId, mode, difficulty, hostId);
    this.isMenuOpen.set(false);
  }

  override handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string, password?: string}) {
    if (this.roomId() === event.roomId) return;
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
  }

  override handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string}) {
    if (event.password) this.wsService.setPendingPassword(event.password);
    this.joinRoom(event.name, event.mode, event.difficulty, this.playerId);
  }

  getPlayerScores() {
    if (this.currentRoomMode() === 'single') {
      return [{ id: this.playerId, score: 0 }];
    }
    const boards = this.store.allBoards();
    return Object.keys(boards).map(id => ({ id, score: boards[id].status === GameStatus.Finished ? 1 : 0 }));
  }

  onTileClick(tile: any) {
    if (this.store.status() !== GameStatus.Playing) return;
    
    this.hintTarget.set(null);
    const board = this.store.myBoard();
    if (!board) return;
    const idx = tile.row * tile.size + tile.col;
    this.store.move(idx);
  }

  private touchStartX = 0;
  private touchStartY = 0;

  onTouchStart(event: TouchEvent) {
    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (event.changedTouches.length > 0) {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      this.handleSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY);
    }
  }

  onMouseDown(event: MouseEvent) {
    this.touchStartX = event.clientX;
    this.touchStartY = event.clientY;
  }

  onMouseUp(event: MouseEvent) {
    this.handleSwipe(this.touchStartX, this.touchStartY, event.clientX, event.clientY);
  }

  handleSwipe(startX: number, startY: number, endX: number, endY: number) {
    if (this.store.status() !== GameStatus.Playing) return;
    this.hintTarget.set(null);
    const board = this.store.myBoard();
    if (!board) return;

    const diffX = endX - startX;
    const diffY = endY - startY;

    if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) return;

    const size = board.size;
    const emptyRow = Math.floor(board.emptyIdx / size);
    const emptyCol = board.emptyIdx % size;
    
    let targetRow = emptyRow;
    let targetCol = emptyCol;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) targetCol -= 1; // Swipe Right -> Tile LEFT of empty moves
      else targetCol += 1;           // Swipe Left -> Tile RIGHT of empty moves
    } else {
      if (diffY > 0) targetRow -= 1; // Swipe Down -> Tile ABOVE empty moves
      else targetRow += 1;           // Swipe Up -> Tile BELOW empty moves
    }

    if (targetRow >= 0 && targetRow < size && targetCol >= 0 && targetCol < size) {
      const idx = targetRow * size + targetCol;
      this.store.move(idx);
    }
  }

  getDifficultyDesc(id: string): string {
    const config = this.gameRegistry.getConfig('sliding');
    const diff = config?.difficulties.find(d => d.id === id);
    return diff ? this.t(diff.labelKey)() : id;
  }

  getElapsedMs(startAt: number): number {
    if (!startAt) return 0;
    
    const finishedTime = this.finishedAt();
    if (this.store.status() === GameStatus.Finished && finishedTime) {
      return Math.max(0, finishedTime - startAt);
    }
    
    return Math.max(0, this.currentTime() - startAt);
  }

  formatTime(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  getOverlayStatus(): 'win' | 'lose' {
    if (this.currentRoomMode() === 'single') return 'win';
    if (this.store.winners().includes(this.playerId)) return 'win';
    return 'lose';
  }

  getOverlayTitle(): string {
    if (this.currentRoomMode() === 'single') return this.t('game.you_win')();
    if (this.store.winners().includes(this.playerId)) return this.t('game.you_win')();
    return this.t('game.you_lose')();
  }

  getOverlaySubtitle(): string {
    return `${this.t('game.timer')()}: ${this.formatTime(this.getElapsedMs(this.currentRoomMode() === 'single' ? (this.store.myBoard()?.startAt || 0) : this.store.globalStartAt()))}`;
  }

  getOverlayStats(): { label: string; value: string | number }[] {
    const stats = [
      { label: this.t('game.moves')() || 'Moves', value: this.store.myBoard()?.moves || 0 }
    ];
    if (this.currentRoomMode() === 'single') {
      const best = this.store.bestTime();
      if (best > 0) {
        stats.push({ label: 'BEST', value: this.formatTime(best * 1000) });
      }
    }
    return stats;
  }

  applyHint() {
    if (this.currentRoomMode() !== 'single' || this.store.status() !== GameStatus.Playing) return;
    const board = this.store.myBoard();
    if (!board) return;
    const cells = board.cells;
    const total = board.size * board.size;
    for (let val = 1; val < total; val++) {
      if (cells.indexOf(val) !== val - 1) {
        this.hintTarget.set(val);
        return;
      }
    }
  }
}
