import { Component, computed, inject, ChangeDetectionStrategy, ViewChild, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonogramStore } from './store/nonogram.store';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameStatus, GameMode, GameDifficulty } from '../../../core/models/game.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameId } from '../../../core/models/game.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-nonogram',
  standalone: true,
  imports: [CommonModule, FormsModule, GameHeaderComponent, GameWaitingRoomComponent, GameLobbyPanelComponent, GameRulesModalComponent],
  templateUrl: './nonogram.component.html',
  styleUrls: ['./nonogram.component.css'],
  providers: [NonogramStore],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NonogramComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(NonogramStore);
  private windowSize = inject(WindowSizeService);
  private i18n = inject(I18nService);
  private authStore = inject(AuthStore);

  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;

  readonly GameStatus = GameStatus;
  readonly GameMode = GameMode;
  readonly GameDifficulty = GameDifficulty;

  private roomLifecycle: RoomLifecycleHandle;

  showRules = signal<boolean>(false);

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  get t() {
    return this.i18n.t.bind(this.i18n);
  }

  goBack() {
    if (this.store.roomId()) {
      if (this.store.hostId() === this.playerId) {
        this.handleDismissRoom();
      } else {
        this.store.leaveRoom();
      }
    }
    this.navigateToLobby();
  }

  getPlayerScores() {
    if (this.store.currentRoomMode() === GameMode.Single) {
      return [{ id: this.playerId, score: 0 }];
    }
    return this.store.playersList().map(id => ({ id, score: 0 }));
  }

  changeSingleDifficulty(diff: string) {
    if (this.store.roomId()) return;
    this.store.currentDifficulty.set(diff);
    this.store.playAgain();
  }

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: GameId.Nonogram,
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => this.returnToLobby(),
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
      this.store.joinRoom('', GameMode.Single);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  returnToLobby() {
    this.store.leaveRoom();
    this.roomLifecycle.clearReconnectInfo();
  }

  // Calculate board layout dynamically to fit in screen
  // A typical cell is 20-30px. Max hints could be half the width.
  readonly maxHintsCount = computed(() => Math.ceil(this.store.width() / 2));
  
  readonly cellSize = computed(() => {
     const w = this.store.width();
     const maxH = this.maxHintsCount();
     // Left/Top hints use 'auto' in CSS so they don't take full cell widths.
     // Estimate them as roughly 50% of maxH in terms of cell equivalents.
     const hintColsEstimated = Math.max(1.5, maxH * 0.5);
     const totalGridCols = w + hintColsEstimated;
     const totalGridRows = this.store.height() + hintColsEstimated;
     
     const isDesktop = this.windowSize.size().w >= 1024;
     // On desktop, the card is up to 800px wide. We can use up to 700px for the board.
     const availableWidth = isDesktop ? 700 : this.windowSize.size().w - 32;
     
     // Relax the height constraint significantly. We'd rather have a large readable board 
     // that might require a slight scroll on very short screens, than a tiny unreadable board.
     const availableHeight = this.windowSize.size().h - 120; 
     
     const sizeW = Math.floor(availableWidth / totalGridCols);
     const sizeH = Math.floor(availableHeight / totalGridRows);
     
     // Base the cell size primarily on width, but apply a loose height constraint.
     // Also increase the absolute maximum size to 120px for massive grids on 4K monitors.
     return Math.max(30, Math.min(sizeW, Math.max(sizeH, 40), 120));
  });

  handleCellClick(x: number, y: number, event: MouseEvent) {
    if (event.button === 2) {
      // Right click
      event.preventDefault();
      this.store.handleCellClick(x, y, true);
    } else {
      this.store.handleCellClick(x, y, false);
    }
  }

  onContextMenu(event: Event) {
    event.preventDefault(); // Prevent native right-click menu
  }
}
