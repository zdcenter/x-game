import { Component, HostListener, OnDestroy, OnInit, inject, effect, computed, signal } from '@angular/core';
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
import { TETRIS_COLS, TETRIS_ROWS, TETROMINO_COLORS, Tetromino, TETROMINO_SHAPES } from './models/tetris.model';

@Component({
  selector: 'app-tetris',
  standalone: true,
  imports: [CommonModule, GameWaitingRoomComponent, GameLobbyPanelComponent, GameRulesModalComponent, GameResultOverlayComponent],
  templateUrl: './tetris.component.html',
  styleUrls: ['./tetris.component.css']
})
export class TetrisComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(TetrisStore);
  private authStore = inject(AuthStore);
  public timerService = inject(GameTimerService);
  private toastService = inject(ToastService);
  i18n = inject(I18nService);
  private gameRegistry = inject(GameRegistryService);

  readonly COLS = TETRIS_COLS;
  readonly ROWS = TETRIS_ROWS;
  readonly COLORS = TETROMINO_COLORS;

  currentRoomMode = this.store.mode;
  currentRoomId = computed(() => this.wsService.gameState()?.roomId || '');
  showRules = signal(false);
  
  gameModes = [
    { id: 'pk_attack', name: 'PK Attack', desc: 'Send garbage lines to opponents', labelKey: 'tetris.mode.pk_attack', icon: '⚔️' },
    { id: 'pk_score', name: 'PK Score', desc: 'Same pieces, highest score wins', labelKey: 'tetris.mode.pk_score', icon: '🏆' }
  ];
  
  difficulties = [];

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  constructor() {
    super();
    this.gameRegistry.register({
      id: 'tetris',
      route: '/games/tetris',
      titleKey: 'tetris.title',
      iconEmoji: '🧱',
      modes: this.gameModes,
      difficulties: this.difficulties,
    });
    effect(() => {
      const status = this.store.status();
      if (status === 'starting') {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  override handleJoinRoom(event: {roomId: string, mode: string, difficulty: string, host: string}) {
    if (this.currentRoomId() === event.roomId) return;
    this.store.joinRoom(event.roomId, event.mode, event.difficulty, event.host);
    this.isMobileSidebarOpen.set(false);
  }

  override handleCreateRoom(config: {name: string, mode: string, difficulty: string}) {
    this.store.joinRoom(config.name, config.mode, config.difficulty, this.playerId);
    this.isMobileSidebarOpen.set(false);
  }

  returnToLobby() {
    this.store.leaveRoom();
    this.store.joinRoom('local', 'single', 'normal', '');
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.store.status() !== 'playing') return;
    
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
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyC':
        this.store.hold();
        event.preventDefault();
        break;
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

    return 'var(--color-bg-card)';
  }

  goBack(): void {
    if (this.currentRoomId()) {
      if (this.store.host() === this.playerId) {
        this.dismissRoom();
      } else {
        this.store.leaveRoom();
      }
    } else {
      this.store.leaveRoom();
    }
    history.back();
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

  getPlayerScores(): Array<{id: string; score: number}> {
    const scores = this.store.opponents().map(opp => ({
      id: opp.id,
      score: opp.score
    }));
    scores.push({ id: this.playerId, score: this.store.score() });
    return scores;
  }
}
