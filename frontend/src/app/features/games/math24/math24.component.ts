import { Component, inject, OnInit, OnDestroy, ViewChild, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { Math24Store } from './store/math24.store';
import { AuthStore } from '../../../core/auth/auth.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { Math24PkStealComponent } from './components/math24-pk-steal/math24-pk-steal.component';
import { Math24PkSpeedComponent } from './components/math24-pk-speed/math24-pk-speed.component';
import { Math24BoardComponent } from './components/math24-board/math24-board.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { Math24LobbyComponent } from './components/math24-lobby/math24-lobby.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Router } from '@angular/router';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';

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
    GameResultOverlayComponent,
    Math24LobbyComponent,
    GameStartingOverlayComponent
  ],
  templateUrl: './math24.component.html'
})
export class Math24Component extends BaseGameComponent implements OnInit, OnDestroy {
  store = inject(Math24Store);
  private authStore = inject(AuthStore);
  private roomLifecycle!: RoomLifecycleHandle;
  private router = inject(Router);
  i18n = inject(I18nService);

  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;

  view = signal<'lobby' | 'room' | 'play'>('lobby');
  startingCountdown = signal(3);
  private countdownInterval: any;

  get playerId(): string {
    return this.authStore.currentUser()?.username || this.authStore.guestId;
  }

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'math24',
      getCurrentMode: () => this.store.currentMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
    
    effect(() => {
      const status = this.store.gameStatus();
      if (this.store.currentMode() !== 'single') {
        if (status === 'starting') {
          untracked(() => {
            this.view.set('play');
            this.startingCountdown.set(3);
            if (this.countdownInterval) clearInterval(this.countdownInterval);
            this.countdownInterval = setInterval(() => {
              this.startingCountdown.update(v => Math.max(1, v - 1));
            }, 1000);
          });
        } else if (status === 'playing') {
          untracked(() => {
            this.view.set('play');
            if (this.countdownInterval) clearInterval(this.countdownInterval);
          });
        } else if (status === 'waiting') {
          untracked(() => {
            this.view.set('room');
            if (this.countdownInterval) clearInterval(this.countdownInterval);
          });
        }
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      this.store.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '');
      if (joinInfo.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '');
      }
      this.view.set('room');
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.store.disconnectWS();
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
      return [
        { label: this.i18n.t('game.level')(), value: this.store.localLevelIndex() + 1 },
        { label: this.i18n.t('game.timer')(), value: `${time}s` }
      ];
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
    this.store.loadNextLevel();
  }

  playAgain() {
    if (this.store.currentMode() === 'single') {
      this.playNextLevel();
    } else {
      this.store.restartGame();
    }
  }

  startLevel(event: { id: string, puzzle: string, difficulty: string, levelIndex: number }) {
    this.view.set('play');
    this.store.startSinglePlayer(event.id, event.puzzle, event.difficulty, event.levelIndex);
  }

  override handleCreateRoom(event: {name: string, mode: string, difficulty: string}) {
    super.handleCreateRoom(event);
    if (event.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(this.store.roomId() || event.name, event.mode, event.difficulty, this.playerId);
    }
    this.view.set("room");
  }

  override handleJoinRoom(params: { roomId: string; mode: string; difficulty: string; host: string }) {
    super.handleJoinRoom(params);
    if (params.mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(params.roomId, params.mode, params.difficulty, params.host);
    }
    this.view.set('room');
  }
  
  override handleDismissRoom() {
    super.handleDismissRoom();
    this.roomLifecycle.clearReconnectInfo();
  }
}
