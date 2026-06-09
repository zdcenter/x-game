import { Component, inject, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { LightsoutStore } from './store/lightsout.store';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
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
    GameRulesModalComponent
  ],
  providers: [LightsoutStore],
  templateUrl: './lightsout.component.html'
})
export class LightsoutComponent extends BaseGameComponent implements OnInit, OnDestroy {
  override store = inject(LightsoutStore);
  private gameRegistry = inject(GameRegistryService);
  private authStore = inject(AuthStore);
  private crossGameJoin = inject(CrossGameJoinService);
  i18n = inject(I18nService);
  private router = inject(Router);

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  showRules = signal(false);

  override get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  getModeName() {
    const mode = this.store.currentRoomMode();
    const key = this.gameRegistry.getModeLabel('lightsout', mode);
    return key ? this.i18n.t(key)() : mode;
  }

  getDifficultyName() {
    const diff = this.store.currentRoomMode() === 'single' ? this.store.localDifficulty() : this.store.size() === 4 ? 'easy' : this.store.size() === 6 ? 'hard' : 'medium';
    const key = this.gameRegistry.getDifficultyLabel('lightsout', diff);
    return key ? this.i18n.t(key)() : diff;
  }

  override ngOnInit() {
    super.ngOnInit();

    const pending = this.crossGameJoin.consumePendingJoin('lightsout');
    if (pending) {
      this.handleJoinRoom({ roomId: pending.roomId, mode: pending.mode, difficulty: pending.difficulty, host: pending.host });
    } else {
      this.store.joinRoom('single_room', 'single', 'medium');
    }

    // Timer effect - wait, we don't use registerAutoStart
    // Timer is not needed for lights out single player? Or we can just start it manually when status becomes playing.
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
    this.gameTimer.stopCountdown();
  }

  openChangeSettings() {
    if (this.lobbyPanel && this.store.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.store.roomId(),
        game: 'lightsout',
        mode: this.store.currentRoomMode(),
        difficulty: this.store.size() === 4 ? 'easy' : this.store.size() === 6 ? 'hard' : 'medium',
        host: this.store.hostId()
      });
    }
  }

  changeDifficulty(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.gameTimer.stopCountdown();
    this.store.changeDifficulty(select.value);
  }

  onLeaveClick() {
    this.gameTimer.stopCountdown();
    if (this.store.currentRoomMode() !== 'single') {
      this.store.leaveRoom();
      this.store.joinRoom('single_room', 'single', 'medium');
    }
  }

  isConnected() {
    return this.wsService.isConnected();
  }

  getOverlayStatus(): 'win' | 'lose' {
    if (this.store.currentRoomMode() === 'pk_speed') {
      return this.store.winners().includes(this.playerId) ? 'win' : 'lose';
    }
    return 'win'; // single player finishes when won
  }

  getOverlayTitle(): string {
    const status = this.getOverlayStatus();
    if (status === 'win') {
      return this.i18n.t('game.you_win')() || 'Victory!';
    }
    return this.i18n.t('game.defeat')() || 'Defeat';
  }

  getOverlaySubtitle(): string {
    if (this.store.currentRoomMode() === 'pk_speed') {
      return this.getOverlayStatus() === 'win' 
        ? (this.i18n.t('game.cleared_first')() || 'You cleared the board first!') 
        : (this.i18n.t('game.opponent_finished')() || 'An opponent cleared the board first!');
    }
    return this.i18n.t('minesweeper.cleared')() || 'Board cleared!';
  }

  getOverlayStats() {
    return [
      { label: 'MOVES', value: this.store.moves() }
    ];
  }
}
