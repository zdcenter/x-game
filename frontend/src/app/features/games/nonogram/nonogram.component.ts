import { Component, computed, inject, ChangeDetectionStrategy, ViewChild, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonogramStore } from './store/nonogram.store';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
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
  imports: [CommonModule, FormsModule, GameHeaderComponent, GameWaitingRoomComponent, GameLobbyPanelComponent, GameRulesModalComponent, GameResultOverlayComponent],
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
  showOverlay = signal<boolean>(false);

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
     const h = this.store.height();
     const maxH = this.maxHintsCount();
     // Hint area uses CSS 'auto' — estimate as ~40% of maxH cell-equivalents
     const hintEq = Math.max(2, maxH * 0.4);
     const totalCols = w + hintEq;
     const totalRows = h + hintEq;

     const vw = this.windowSize.size().w;
     const vh = this.windowSize.size().h;

     let availW: number;
     if (vw >= 1536) {
       // 2xl: left(360) + right(360) + gaps(80) + padding(48)
       availW = vw - 360 - 360 - 128;
     } else if (vw >= 1280) {
       // xl: left(280) + right(300) + gaps(80) + padding(48)
       availW = vw - 280 - 300 - 128;
     } else if (vw >= 1024) {
       // lg: NO left panel, right(260) + gaps(48) + padding(32)
       availW = vw - 260 - 80;
     } else {
       // mobile/tablet: full width minus card+page padding
       availW = vw - 40;
     }

     // Height: header(~80px), draw toggle(~60px), padding(~40px)
     const availH = vh - 180;

     const sizeW = Math.floor(availW / totalCols);
     const sizeH = Math.floor(availH / totalRows);

     // Use the smaller constraint, minimum 28px, maximum 120px
     return Math.max(28, Math.min(sizeW, sizeH, 120));
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

  getGameResult(): 'win' | 'lose' {
    if (this.store.currentRoomMode() === GameMode.Single) return 'win';
    const raw = this.wsService.gameState();
    if (!raw || !raw.winners) return 'lose';
    return raw.winners.includes(this.playerId) ? 'win' : 'lose';
  }

  handleRestart() {
    this.store.playAgain();
  }

  onLeaveClick() {
    this.store.leaveRoom();
    this.navigateToLobby();
  }
}
