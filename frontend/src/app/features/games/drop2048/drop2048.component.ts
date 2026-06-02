import { Component, inject, OnInit, OnDestroy, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { Drop2048Store } from './store/drop2048.store';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { PlayerBadgeComponent } from '../../../shared/components/player-badge/player-badge.component';
import { Drop2048BoardComponent } from './components/drop2048-board/drop2048-board.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameTimerService } from '../../../core/services/game-timer.service';

@Component({
  selector: 'app-drop2048',
  standalone: true,
  imports: [
    CommonModule, 
    GameLobbyPanelComponent, 
    GameHeaderComponent,
    GameWaitingRoomComponent,
    GameResultOverlayComponent,
    GameStartingOverlayComponent,
    PlayerBadgeComponent,
    Drop2048BoardComponent
  ],
  providers: [Drop2048Store],
  templateUrl: './drop2048.component.html'
})
export class Drop2048Component extends BaseGameComponent implements OnInit, OnDestroy {
  store = inject(Drop2048Store);
  roomLifecycle!: RoomLifecycleHandle;
  private router = inject(Router);
  i18n = inject(I18nService);

  get playerId(): string {
    return this.store.playerId;
  }

  view = signal<'lobby' | 'room' | 'play'>('lobby');

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'drop2048',
      getCurrentMode: () => this.store.currentMode(),
      onLeaveRoom: () => {
        this.store.leaveGame();
        this.roomLifecycle.clearReconnectInfo();
      },
    });
    
    effect(() => {
      const status = this.store.status();
      const rawState = (this.store as any).rawState();
      
      untracked(() => {
        if (this.store.currentMode() !== 'single') {
          if (status === 'starting' && rawState?.globalStartAt) {
            this.view.set('play');
            this.gameTimer.startCountdown();
          } else if (status === 'playing') {
            this.view.set('play');
            if (this.store.board().length === 0) {
                this.store.spawnBlock();
            }
          } else if (status === 'waiting') {
            this.view.set('room');
          } else if (status === 'finished') {
            this.view.set('play');
          }
        } else {
          if (status === 'playing' || status === 'finished') {
            this.view.set('play');
          }
        }
      });
    });
  }

  override ngOnInit() {
    super.ngOnInit();
    
    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      // Setup room via WS would be handled by Manager usually, but here we just wait for WS to sync
      if (joinInfo.mode !== 'single') {
        this.roomLifecycle.saveReconnectInfo(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '');
        this.view.set('room');
      } else {
        this.view.set('play');
        this.store.startGame();
      }
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveGame();
  }

  onJoinSinglePlayer(diff: any) {
    this.view.set('play');
    this.store.joinRoom('single_room', 'single', diff, this.playerId);
    this.store.startGame();
  }

  onRoomCreated() {
    this.view.set('room');
  }

  onLeaveClick() {
    if (this.store.currentMode() === 'single') {
      this.view.set('lobby');
    } else {
      this.store.leaveGame();
      this.view.set('lobby');
      this.roomLifecycle.clearReconnectInfo();
    }
  }

  openChangeSettings() {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/games/drop2048']);
    });
  }

  getResultTitle(): string {
    if (this.store.currentMode() === 'single') {
      return 'game.game_over';
    }
    const winners = this.store.winners();
    if (winners.includes(this.store.playerId)) return 'game.you_win';
    return 'game.you_lose';
  }
}
