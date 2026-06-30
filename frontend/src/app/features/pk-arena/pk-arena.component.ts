import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { CrossGameJoinService } from '../../core/services/cross-game-join.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { GamePkLobbyComponent, PkCreateRoomEvent, PkJoinRoomEvent } from '../../shared/components/game-pk-lobby/game-pk-lobby.component';

@Component({
  selector: 'app-pk-arena',
  standalone: true,
  imports: [GamePkLobbyComponent],
  template: `
    <div class="flex-grow flex flex-col h-[calc(100vh-64px)] p-1 lg:p-4 bg-[var(--color-bg-base)] overflow-hidden">
      <div class="flex-grow flex flex-col min-h-0 overflow-hidden rounded-2xl lg:rounded-3xl backdrop-blur-xl border shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300"
           style="background-color: var(--color-bg-card); border-color: var(--color-border-card)">
        <app-game-pk-lobby
          [gameId]="initialGameId()"
          [isArena]="true"
          currentRoomId=""
          (createRoom)="handleCreate($event)"
          (joinRoom)="handleJoin($event)"
          (back)="goBack()">
        </app-game-pk-lobby>
      </div>
    </div>
  `
})
export class PkArenaComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthStore);
  private cross = inject(CrossGameJoinService);
  private wsService = inject(WebSocketService);

  initialGameId = signal('');

  ngOnInit() {
    this.initialGameId.set(this.route.snapshot.queryParams['game'] || '');
    const player = this.auth.currentUser()?.username || this.auth.guestId;
    this.wsService.connectLobby(player, player);
  }

  ngOnDestroy() {
    // Lobby WS stays alive across navigations
  }

  handleCreate(e: PkCreateRoomEvent) {
    const playerId = this.auth.currentUser()?.username || this.auth.guestId;
    this.cross.setPendingJoin({
      game: e.gameId, roomId: e.name, mode: e.mode,
      difficulty: e.difficulty, host: playerId, action: 'create',
      password: e.password, target: e.target
    });
    this.router.navigate([`/games/${e.gameId}`]);
  }

  handleJoin(_e: PkJoinRoomEvent) {
    // Cross-game joins handled internally by GamePkLobbyComponent via CrossGameJoinService
  }

  goBack() {
    history.back();
  }
}
