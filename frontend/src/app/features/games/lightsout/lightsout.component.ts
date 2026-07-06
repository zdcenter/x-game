import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, inject, OnDestroy, OnInit, ViewChild, signal, effect } from '@angular/core';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { LightsoutStore } from './store/lightsout.store';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { boardSizePx } from '../../../core/utils/board-size.util';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Router } from '@angular/router';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { CommonModule } from '@angular/common';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameToolbarComponent } from '../../../shared/components/game-toolbar/game-toolbar.component';
import { GamePlayerMiniHudComponent } from '../../../shared/components/game-player-mini-hud/game-player-mini-hud.component';

@Component({
  selector: 'app-lightsout',
  standalone: true,
  imports: [
    CommonModule,
    GameLobbyPanelComponent,
    GameHeaderComponent,
    GameWaitingRoomComponent,
    GameStartingOverlayComponent,
    PlayerBadgeComponent,
    GameResultOverlayComponent,
    GameRulesModalComponent,
    GameToolbarComponent,
    GamePlayerMiniHudComponent
  ],
  providers: [LightsoutStore],
  templateUrl: './lightsout.component.html'
})
export class LightsoutComponent extends BaseGameComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  override store = inject(LightsoutStore);
  private gameRegistry = inject(GameRegistryService);
  private authStore = inject(AuthStore);
  i18n = inject(I18nService);
  private router = inject(Router);

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  showRules = signal(false);
  showOverlay = signal(false);
  hintCell = signal<{r: number, c: number} | null>(null);

  // chrome = nav + outer-padding + card-padding + header + player-badges + board-py + toolbar
  boardSizePx = boardSizePx(inject(WindowSizeService), { mobile: 320, tablet: 350, pc: 380 }, 600);

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  getModeName() {
    const mode = this.store.currentRoomMode();
    const key = this.gameRegistry.getModeLabel('lightsout', mode);
    return key ? this.i18n.t(key)() : mode;
  }

  getDifficultyName() {
    const diff = this.store.currentRoomMode() === GameMode.Single ? this.store.currentDifficulty() : this.store.size() === 4 ? GameDifficulty.Easy : this.store.size() === 6 ? GameDifficulty.Hard : this.store.size() === 7 ? GameDifficulty.Expert : this.store.size() === 8 ? GameDifficulty.Master : GameDifficulty.Medium;
    const key = this.gameRegistry.getDifficultyLabel('lightsout', diff);
    return key ? this.i18n.t(key)() : diff;
  }

  getSubtitle(): string {
    return this.getModeName() + ' - ' + this.getDifficultyName();
  }



  private roomLifecycle!: RoomLifecycleHandle;

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'lightsout',
      getCurrentMode: () => this.store.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });

    effect((onCleanup) => {
      const isFin = this.store.status() === GameStatus.Finished;
      if (isFin) {
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
      if (pending.mode !== GameMode.Single) {
        this.roomLifecycle.saveReconnectInfo(pending.roomId, pending.mode, pending.difficulty, pending.host || '');
      }
    } else {
      this.store.joinRoom('single_room', GameMode.Single, GameDifficulty.Medium);
    }
  }

  override handleCreateRoom(event: {name: string, mode: string, difficulty: string, password?: string, target?: number}) {
    super.handleCreateRoom(event);
    if (event.mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(this.store.roomId() || event.name, event.mode, event.difficulty, this.playerId);
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

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
    this.gameTimer.stopCountdown();
  }

  override openChangeSettings() {
    if (this.lobbyPanel && this.store.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.store.roomId(),
        game: 'lightsout',
        mode: this.store.currentRoomMode(),
        difficulty: this.store.size() === 4 ? GameDifficulty.Easy : this.store.size() === 6 ? GameDifficulty.Hard : this.store.size() === 7 ? GameDifficulty.Expert : this.store.size() === 8 ? GameDifficulty.Master : GameDifficulty.Medium,
        host: this.store.hostId()
      });
    }
  }

  changeDifficulty(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.gameTimer.stopCountdown();
    this.store.changeDifficulty(select.value);
  }



  isConnected() {
    return this.wsService.isConnected();
  }

  getOverlayStatus(): 'win' | 'lose' {
    if (this.store.currentRoomMode() !== GameMode.Single) {
      return this.store.winners().includes(this.playerId) ? 'win' : 'lose';
    }
    return 'win';
  }

  getOverlayTitle(): string {
    const won = this.getOverlayStatus() === 'win';
    if (this.store.currentRoomMode() !== GameMode.Single && !this.store.isSeriesOver()) {
      return won ? this.i18n.t('game.round_won')() : this.i18n.t('game.round_lost')();
    }
    if (won) return this.i18n.t('game.you_win')();
    return this.i18n.t('game.you_lose')();
  }

  getOverlaySubtitle(): string {
    if (this.store.currentRoomMode() !== GameMode.Single) {
      if (!this.store.isSeriesOver()) {
        return this.store.pkScoreLabel();
      }
      return this.getOverlayStatus() === 'win'
        ? (this.i18n.t('game.cleared_first')() || 'You cleared the board first!')
        : (this.i18n.t('game.opponent_finished')() || 'An opponent cleared the board first!');
    }
    return this.i18n.t('game.all_lights_out')() || 'All lights out!';
  }

  getOverlayStats() {
    return [
      { label: 'MOVES', value: this.store.moves() }
    ];
  }

  onCellClick(r: number, c: number) {
    this.hintCell.set(null);
    this.store.toggle(r, c);
  }

  applyHint() {
    if (this.store.currentRoomMode() !== GameMode.Single || this.store.status() !== GameStatus.Playing) return;
    const sol = this.store.currentSolution();
    const size = this.store.size();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (sol[r] && sol[r][c]) {
          this.hintCell.set({ r, c });
          return;
        }
      }
    }
  }
}
