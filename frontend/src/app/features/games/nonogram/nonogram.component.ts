import { Component, computed, inject, ChangeDetectionStrategy, ViewChild, OnInit, OnDestroy, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonogramStore } from './store/nonogram.store';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GamePlayerMiniHudComponent } from '../../../shared/components/game-player-mini-hud/game-player-mini-hud.component';
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


@Component({
  selector: 'app-nonogram',
  standalone: true,
  imports: [CommonModule, FormsModule,  GameWaitingRoomComponent,   GameResultOverlayComponent, GamePlayerMiniHudComponent, PlayerBadgeComponent, PlayerListContainerComponent, GameStartingOverlayComponent, GameToolbarComponent, GameLayoutComponent],
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
      return [{ id: this.playerId, score: 0, progress: 0 }];
    }
    return this.store.playersList().map((p: any) => ({ id: p.id, score: p.score || 0, progress: p.progress || 0 }));
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
      this.store.joinRoom('', GameMode.Single);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  

  // Calculate board layout dynamically to fit in screen
  // A typical cell is 20-30px. Max hints could be half the width.
  readonly maxHintsCount = computed(() => Math.ceil(this.store.width() / 2));
  
  readonly hideLeftPanel = computed(() => this.store.width() > 15);

  readonly cellSize = computed(() => {
     const w = this.store.width();
     const h = this.store.height();
     const maxH = this.maxHintsCount();
     // Hint area uses CSS 'auto' — estimate as ~80% of maxH cell-equivalents to prevent overflow
     const hintEq = Math.max(2.5, maxH * 0.8);
     const totalCols = w + hintEq;
     const totalRows = h + hintEq;

     const vw = this.windowSize.size().w;
     const vh = this.windowSize.size().h;
     const hideLeft = this.hideLeftPanel();

     let availW: number;
     if (vw >= 1536) {
       // 2xl: left(360) + right(360) + gaps(80) + padding(48)
       availW = hideLeft ? vw - 360 - 100 : vw - 360 - 360 - 128;
     } else if (vw >= 1280) {
       // xl: left(280) + right(300) + gaps(80) + padding(48)
       availW = hideLeft ? vw - 300 - 100 : vw - 280 - 300 - 128;
     } else if (vw >= 1024) {
       // lg: NO left panel, right(260) + gaps(48) + padding(32)
       availW = vw - 260 - 80;
     } else {
       // mobile/tablet: full width minus card+page padding (reduced to ensure no overflow)
       availW = vw - 60;
     }

     // Height: header(~80px), draw toggle(~70px)
     const availH = vh - 150;

     const sizeW = Math.floor(availW / totalCols);
     
     let finalSize = sizeW;
     // For normal grids, constrain by height to fit everything in screen without scrolling.
     // For large grids (focus mode), relax vertical constraint to maximize width and allow vertical scroll.
     if (!hideLeft) {
       const sizeH = Math.floor(availH / totalRows);
       finalSize = Math.min(sizeW, sizeH);
     }

     // Use the constraint, minimum 20px, maximum 120px
     return Math.max(20, Math.min(finalSize, 120));
  });

  private touchTimer: any;
  private touchMoved = false;

  handleTouchStart(x: number, y: number, event: TouchEvent) {
    this.touchMoved = false;
    // Long press -> opposite of current drawMode
    const oppositeMode = this.store.drawMode() === 'fill' ? 'cross' : 'fill';
    this.touchTimer = setTimeout(() => {
      if (!this.touchMoved) {
        this.store.handleCellClick(x, y, false, oppositeMode);
        this.haptic.vibrateMedium();
        this.touchTimer = null;
      }
    }, 400);
  }

  handleTouchMove() {
    this.touchMoved = true;
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
    }
  }

  handleTouchEnd(x: number, y: number, event: TouchEvent) {
    if (this.touchTimer && !this.touchMoved) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
      // Short press -> use current drawMode
      this.store.handleCellClick(x, y, false, this.store.drawMode());
    }
    if (!this.touchMoved && event.cancelable) {
      event.preventDefault();
    }
  }

  handleTouchCancel() {
    if (this.touchTimer) {
      clearTimeout(this.touchTimer);
      this.touchTimer = null;
    }
  }

  handleCellClick(x: number, y: number, event: MouseEvent) {
    if (event.button === 2) {
      event.preventDefault();
      this.store.handleCellClick(x, y, true);
    } else {
      this.store.handleCellClick(x, y, false);
    }
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
    
    const playersList = this.getPlayerScores();
    const me = playersList.find(p => p.id === this.playerId);
    if (!me) return true;

    if (this.store.currentRoomMode() === GameMode.Speed) {
      return me.progress < 100;
    }
    
    if (this.store.currentRoomMode() === GameMode.Steal) {
      const myScore = me.score || 0;
      const otherScores = playersList.filter(p => p.id !== this.playerId).map(p => p.score || 0);
      const maxOtherScore = otherScores.length > 0 ? Math.max(...otherScores) : 0;
      return myScore < maxOtherScore;
    }
    return false;
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

  getGameResult(): 'win' | 'lose' {
    if (this.store.currentRoomMode() === GameMode.Single) return 'win';
    return this.isDefeat() ? 'lose' : 'win';
  }

  handleRestart() {
    this.store.playAgain();
  }


}
