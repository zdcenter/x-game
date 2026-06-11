import { GameHeaderComponent } from '../../../shared/components/game-header/game-header.component';
import { Component, inject, OnInit, OnDestroy, signal, computed, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../core/services/settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GomokuStore } from './store/gomoku.store';
import { GameResultOverlayComponent } from '../../../shared/components/game-result-overlay/game-result-overlay.component';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameWaitingRoomComponent } from '../../../shared/components/game-waiting-room/game-waiting-room.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { GameStartingOverlayComponent } from '../../../shared/components/game-starting-overlay/game-starting-overlay.component';
import { GameService } from '../../../core/services/game.service';
import { AudioService } from '../../../core/services/audio.service';

@Component({
  selector: 'app-gomoku',
  standalone: true,
  imports: [CommonModule, GameResultOverlayComponent, GameRulesModalComponent, GameWaitingRoomComponent, GameLobbyPanelComponent, GameHeaderComponent, GameStartingOverlayComponent],
  providers: [GomokuStore],
  templateUrl: './gomoku.component.html',
  styleUrls: ['./gomoku.component.css']
})
export class GomokuComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  authStore = inject(AuthStore);
  ws = inject(WebSocketService);
  store = inject(GomokuStore);
  gameTimer = inject(GameTimerService);
  gameService = inject(GameService);
  settingsService = inject(SettingsService);
  audio = inject(AudioService);
  
  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;
  roomLifecycle: RoomLifecycleHandle;

  constructor() {
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'gomoku',
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => this.returnToLobby(),
    });

    effect(() => {
      const status = this.gameStatus().status;
      if (status === 'starting') {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }
      
      // Delay result overlay so players can see the winning line
      if (status === 'finished') {
        if (this.gameStatus().winner && this.gameStatus().winner !== 'tie') {
          this.audio.playGomoku('stoneWin');
        } else if (this.gameStatus().winner === 'tie') {
          this.audio.playLose(); // fallback for tie or surrender
        }
        setTimeout(() => this.showResultOverlay.set(true), 2000);
      } else {
        this.showResultOverlay.set(false);
      }
    });
  }

  showRules = signal(false);
  isMobileSidebarOpen = signal(false);
  showResultOverlay = signal(false);

  // Computed state
  board = this.store.board;
  gameStatus = this.store.gameStatus;
  currentTurn = this.store.currentTurn;
  playerColors = this.store.playerColors;
  myPlayerId = this.store.myPlayerId;
  lastMove = computed(() => this.store.lastMove());
  isSpectator = this.store.isSpectator;
  
  // Room state
  currentRoomMode = signal<string>('single');
  currentDifficulty = signal<string>('medium');
  roomId = signal<string>('');
  hostId = signal<string>('');

  get mappedPlayers() {
    return this.store.players().map(p => ({ id: p }));
  }

  ngOnInit() {
    this.gameService.visitGame('gomoku').subscribe({
      error: err => console.error('Failed to update visit count', err)
    });

    const playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
    this.ws.connectLobby(playerId, playerId);

    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      if (joinInfo.password) this.ws.setPendingPassword(joinInfo.password);
      this.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '');
    } else {
      this.route.queryParams.subscribe(params => {
        if (this.roomId()) {
          return;
        }
        const mode = params['mode'] || 'single';
        const diff = params['difficulty'] || 'medium';
        const roomId = params['room'] || `gomoku-${Date.now()}`;
        const host = params['host'] || roomId;
        
        // Prevent re-joining if we already are in this room
        if (this.roomId() === roomId && this.currentRoomMode() === mode) {
          return;
        }

        this.joinRoom(roomId, mode, diff, host);
      });
    }
  }

  joinRoom(roomId: string, mode: string, difficulty: string, host: string) {
    if (!roomId) return;
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.roomId.set(roomId);
    this.hostId.set(host);

    const playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
    
    this.store.init(
      mode,
      difficulty,
      roomId,
      playerId,
      host
    );
    
    if (mode !== 'single') {
      this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, host);
    }
  }

  ngOnDestroy() {
    this.store.destroy();
  }

  get isMyTurn(): boolean {
    return this.currentTurn() === this.myPlayerId();
  }

  get myColor(): number {
    return this.playerColors()[this.myPlayerId()] || 1;
  }

  get currentTurnColor(): number {
    const turnId = this.currentTurn();
    if (!turnId) return 1;
    return this.playerColors()[turnId] || 1;
  }

  get turnText(): string {
    if (this.isSpectator()) {
      return this.currentTurnColor === 1 
        ? (this.i18n.t('gomoku.turn.black')() || "Black's Turn")
        : (this.i18n.t('gomoku.turn.white')() || "White's Turn");
    }
    return this.isMyTurn 
      ? (this.i18n.t('gomoku.turn.yours')() || "Your Turn")
      : (this.i18n.t('gomoku.turn.opponent')() || "Opponent's Turn");
  }


  isWinningPiece(y: number, x: number): boolean {
    const line = this.store.winningLine();
    if (!line) return false;
    return line.some(p => p[0] === y && p[1] === x);
  }

  onCellClick(y: number, x: number) {
    this.store.makeMove(y, x);
  }

  onRestart() {
    this.store.startGame();
  }

  changeDifficulty(event: Event) {
    const diff = (event.target as HTMLSelectElement).value;
    if (diff === this.currentDifficulty()) return;
    this.currentDifficulty.set(diff);
    // Re-init the store to apply new difficulty
    this.store.init(
      this.currentRoomMode(),
      this.currentDifficulty(),
      this.roomId(),
      this.myPlayerId(),
      this.hostId()
    );
  }

  returnToLobby() {
    this.roomId.set('');
    this.store.leaveGame();
    this.roomLifecycle.clearReconnectInfo();
    this.router.navigate(['/lobby']);
  }

  openChangeSettings() {
    if (this.lobbyPanel && this.roomId()) {
      this.isMobileSidebarOpen.set(true);
      this.lobbyPanel.openUpdateRoomModal({
        id: this.roomId(),
        game: 'gomoku',
        mode: this.currentRoomMode(),
        difficulty: this.currentDifficulty(),
        host: this.hostId()
      });
    }
  }

  handleCreateRoom(config: any) {
    if (config.password) this.ws.setPendingPassword(config.password);
    const roomId = config.name || `gomoku-${Date.now()}`;
    const host = this.myPlayerId();
    const diff = config.difficulty || 'medium';
    this.joinRoom(roomId, config.mode, diff, host);
    this.isMobileSidebarOpen.set(false);
  }

  handleJoinRoom(room: any) {
    if (room.password) this.ws.setPendingPassword(room.password);
    const diff = room.difficulty || 'medium';
    this.joinRoom(room.roomId, room.mode, diff, room.host);
    this.isMobileSidebarOpen.set(false);
  }

  onSurrender() {
    this.store.surrender();
  }

  get winnerText(): string {
    const winnerId = this.gameStatus().winner;
    if (winnerId === 'tie') return this.i18n.t('gomoku.winner.tie')();
    if (winnerId === this.myPlayerId()) return this.i18n.t('game.you_win')();
    if (this.currentRoomMode() === 'single' && winnerId === 'AI') return this.i18n.t('game.game_over')();
    
    // PvP opponent wins
    const color = this.playerColors()[winnerId!] === 1 ? 'gomoku.winner.black' : 'gomoku.winner.white';
    return this.i18n.t(color)();
  }
}
