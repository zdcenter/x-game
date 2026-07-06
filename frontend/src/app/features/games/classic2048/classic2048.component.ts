import { GameSpectatingOverlayComponent, SpectatingPlayerInfo } from '../../../shared/components/game-spectating-overlay/game-spectating-overlay.component';
import { AdService } from '../../../core/services/ad.service';
import { computed, Component, inject, OnInit, OnDestroy, HostListener, ViewChild, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../core/auth/auth.store';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { Classic2048Store } from './store/classic2048.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameMode, GameStatus } from '../../../core/models/game.model';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SettingsService } from '../../../core/services/settings.service';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { GameStatsService } from '../../../core/services/game-stats.service';
import { boardSizePx } from '../../../core/utils/board-size.util';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { ToastService } from '../../../core/services/toast.service';
@Component({
  selector: 'app-classic2048',
  standalone: true,
  imports: [GameSpectatingOverlayComponent, 
    CommonModule,
    GameHeaderComponent,
    GameLobbyPanelComponent,
    GameWaitingRoomComponent,
    GameResultOverlayComponent,
    GameStartingOverlayComponent,
    PlayerBadgeComponent,
    GameRulesModalComponent,
    GameToolbarComponent,
    ],
  templateUrl: './classic2048.component.html',
  styleUrls: ['./classic2048.component.css'],
  providers: [Classic2048Store]
})
export class Classic2048Component extends BaseGameComponent implements OnInit, OnDestroy {
  spectatingPlayers = computed<SpectatingPlayerInfo[]>(() => {
    return this.store.playersList().map(p => {
      const board = this.store.pkBoards()[p.id];
      return {
        id: p.id,
        score: board?.score || 0,
        status: board?.status || 'playing'
      };
    });
  });
  adService = inject(AdService);
  override store = inject(Classic2048Store);
  i18n = inject(I18nService);
  private statsService = inject(GameStatsService);
  authStore = inject(AuthStore);
  toastService = inject(ToastService);
  
  GameStatus = GameStatus;
  GameMode = GameMode;
  math = Math;

  showRules = signal(false);

  get playerId(): string { return this.authStore.currentUser()?.username || this.authStore.guestId; }

  private lifecycle!: RoomLifecycleHandle;

  timeSeconds = 0;
  private timerInterval: any;

  // Board sizes
  boardSizePx = boardSizePx(inject(WindowSizeService), { mobile: 320, tablet: 400, pc: 450 });

  @ViewChild(GameLobbyPanelComponent) lobbyPanel!: GameLobbyPanelComponent;

  constructor() {
    super();
    this.lifecycle = setupRoomLifecycle({
      gameId: 'classic2048',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.lifecycle.clearReconnectInfo();
      },
    });

    effect(() => {
      if (this.store.status() === GameStatus.Finished && this.store.currentRoomMode() === GameMode.Single) {
        this.submitScore();
      }
    });

    effect(() => {
      if (this.store.status() === GameStatus.Playing) {
        this.timerInterval = setInterval(() => { this.timeSeconds++; }, 1000);
      } else {
        clearInterval(this.timerInterval);
      }
    });
  }

  get timeDisplay() {
    const m = Math.floor(this.timeSeconds / 60);
    const s = this.timeSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  override ngOnInit() {
    super.ngOnInit();
    const pending = this.lifecycle.consumePendingOrReconnect();
    if (pending) {
      this.store.joinRoom(pending.roomId, pending.mode, pending.difficulty, pending.host ?? '');
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  override handleJoinRoom(params: any) {
    super.handleJoinRoom(params);
    if (params.mode !== GameMode.Single) {
      this.lifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
  }

  override handleCreateRoom(params: any) {
    super.handleCreateRoom(params);
    if (params.mode !== GameMode.Single) {
      this.lifecycle.saveReconnectInfo(params.name, params.mode, params.difficulty, this.playerId);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.store.move('up');
        event.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.store.move('down');
        event.preventDefault();
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.store.move('left');
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.store.move('right');
        event.preventDefault();
        break;
    }
  }

  // Swipe handling
  private touchStartX = 0;
  private touchStartY = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (this.store.status() !== GameStatus.Playing) return;
    const touchEndX = event.changedTouches[0].screenX;
    const touchEndY = event.changedTouches[0].screenY;
    
    const dx = touchEndX - this.touchStartX;
    const dy = touchEndY - this.touchStartY;
    
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return; // Ignore small movements
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) this.store.move('right');
      else this.store.move('left');
    } else {
      if (dy > 0) this.store.move('down');
      else this.store.move('up');
    }
  }

  getTileClass(value: number): string {
    return value <= 2048 ? `tile-${value}` : 'tile-2048';
  }

  getTileFontSize(value: number): string {
    if (value < 100) return '2rem';
    if (value < 1000) return '1.5rem';
    return '1.2rem';
  }

  getOverlayTitle(): string {
    const won = this.store.winners().includes(this.playerId);
    return won ? this.i18n.t('game.you_win')() : this.i18n.t('game.you_lose')();
  }

  submitScore() {
    if (this.store.currentRoomMode() === GameMode.Single) {
      this.statsService.submitStat('classic2048', {
        mode: GameMode.Single,
        difficulty: this.store.currentDifficulty(),
        score: this.store.localScore(),
        time: this.timeSeconds,
        won: true
      }).subscribe();
    }
  }

  handleRevive() {
    this.store.reviveGame();
  }
}
