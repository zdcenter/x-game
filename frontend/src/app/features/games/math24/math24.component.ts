import { Component, inject, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { Math24Store } from './store/math24.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { Math24PkStealComponent } from './components/math24-pk-steal/math24-pk-steal.component';
import { Math24PkSpeedComponent } from './components/math24-pk-speed/math24-pk-speed.component';
import { Math24BoardComponent } from './components/math24-board/math24-board.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-math24',
  standalone: true,
  imports: [
    CommonModule, 
    GameLobbyPanelComponent, 
    GameHeaderComponent,
    GameWaitingRoomComponent,
    Math24PkStealComponent,
    Math24PkSpeedComponent,
    Math24BoardComponent,
    GameResultOverlayComponent
  ],
  templateUrl: './math24.component.html'
})
export class Math24Component extends BaseGameComponent implements OnInit, OnDestroy {
  store = inject(Math24Store);
  private authStore = inject(AuthStore);
  private crossGameJoin = inject(CrossGameJoinService);
  private router = inject(Router);
  i18n = inject(I18nService);

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  override ngOnInit() {
    super.ngOnInit();
    
    // Cross Game Join
    const pending = this.crossGameJoin.consumePendingJoin('math24');
    if (pending) {
      this.handleJoinRoom({ roomId: pending.roomId, mode: pending.mode, difficulty: pending.difficulty, host: pending.host || '' });
    } else if (this.store.currentMode() === 'single') {
      this.store.startSinglePlayer();
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
  }

  returnToLobby() {
    this.store.leaveRoom();
    this.router.navigate(['/lobby']);
  }

  openChangeSettings() {
    if (this.lobbyPanel && this.store.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.store.roomId(),
        game: 'math24',
        mode: this.store.currentMode(),
        difficulty: this.store.currentDifficulty(),
        host: this.store.host()
      });
    }
  }

  getGameResultStatus(): 'win' | 'lose' {
    if (this.store.currentMode() === 'single') return 'win';
    const isWinner = this.store.winners().includes(this.playerId);
    return isWinner ? 'win' : 'lose';
  }

  getGameResultTitle(): string {
    if (this.store.currentMode() === 'single') return this.i18n.t('game.win')();
    const isWinner = this.store.winners().includes(this.playerId);
    return isWinner ? this.i18n.t('game.win')() : this.i18n.t('game.lose')();
  }

  getStats(): { label: string; value: string | number }[] {
    if (this.store.currentMode() === 'single') {
      const time = this.store.timeSpent();
      return [{ label: this.i18n.t('game.time')(), value: `${time}s` }];
    }
    const myPlayer = this.store.players()[this.playerId];
    if (myPlayer) {
      if (this.store.currentMode() === 'pk_steal') {
        return [{ label: 'Score', value: myPlayer.score || 0 }];
      } else {
        return [{ label: 'Solved', value: myPlayer.progress || 0 }];
      }
    }
    return [];
  }

  playNextLevel() {
    this.store.startSinglePlayer(this.store.currentDifficulty(), this.store.localLevelIndex() + 1);
  }

  playAgain() {
    // In PK mode, the host usually restarts the game, but we can emit a ready state if supported, 
    // or just return to lobby for now if there is no built-in ready mechanism in Math24 yet.
    this.returnToLobby();
  }

  onSinglePlayerDifficultyChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.store.startSinglePlayer(target.value);
  }
}
