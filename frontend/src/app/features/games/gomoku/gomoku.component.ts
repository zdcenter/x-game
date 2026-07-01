import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
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
import { BaseGameComponent } from '../../../core/utils/base-game.component';

@Component({
  selector: 'app-gomoku',
  standalone: true,
  imports: [CommonModule, GameResultOverlayComponent, GameRulesModalComponent, GameWaitingRoomComponent, GameLobbyPanelComponent, GameHeaderComponent, GameStartingOverlayComponent],
  providers: [GomokuStore],
  templateUrl: './gomoku.component.html',
  styleUrls: ['./gomoku.component.css']
})
export class GomokuComponent extends BaseGameComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  GameStatus = GameStatus;
  GameDifficulty = GameDifficulty;
  i18n = inject(I18nService);
  route = inject(ActivatedRoute);
  authStore = inject(AuthStore);
  override store = inject(GomokuStore);
  audio = inject(AudioService);
  
  @ViewChild('lobbyPanel') lobbyPanel?: GameLobbyPanelComponent;
  roomLifecycle: RoomLifecycleHandle;

  constructor() {
    super();
    this.roomLifecycle = setupRoomLifecycle({
      gameId: 'gomoku',
      getCurrentMode: () => this.currentRoomMode(),
      onLeaveRoom: () => {
        this.store.leaveRoom();
        if (this.roomLifecycle) {
          this.roomLifecycle.clearReconnectInfo();
        }
      },
    });

    effect(() => {
      const status = this.gameStatus();
      if (status === GameStatus.Starting) {
        this.gameTimer.startCountdown();
      } else {
        this.gameTimer.stopCountdown();
      }
      
      // Delay result overlay so players can see the winning line
      if (status === GameStatus.Finished) {
        if (this.store.winner() && this.store.winner() !== 'tie') {
          this.audio.playGomoku('stoneWin');
        } else if (this.store.winner() === 'tie') {
          this.audio.playLose(); // fallback for tie or surrender
        }
        setTimeout(() => this.showResultOverlay.set(true), 2000);
      } else {
        this.showResultOverlay.set(false);
      }
    });
  }

  showRules = signal(false);
  showResultOverlay = signal(false);

  // Computed state
  board = this.store.board;
  gameStatus = this.store.status;
  currentTurn = this.store.currentTurn;
  playerColors = this.store.playerColors;
  myPlayerId = this.store.playerId;
  lastMove = computed(() => this.store.lastMove());
  isSpectator = this.store.isSpectator;
  
  // Room state
  currentRoomMode = signal<string>(GameMode.Single);
  currentDifficulty = signal<string>(GameDifficulty.Medium);
  roomId = signal<string>('');
  hostId = signal<string>('');

  get mappedPlayers() {
    return this.store.playersList();
  }

  override get playerId(): string {
    return this.myPlayerId();
  }

  override ngOnInit() {
    super.ngOnInit();

    const joinInfo = this.roomLifecycle.consumePendingOrReconnect();
    if (joinInfo) {
      if (joinInfo.password) this.wsService.setPendingPassword(joinInfo.password);
      this.joinRoom(joinInfo.roomId, joinInfo.mode, joinInfo.difficulty, joinInfo.host || '', joinInfo.target ?? 1);
    } else {
      this.route.queryParams.subscribe(params => {
        if (this.roomId()) {
          return;
        }
        const mode = params['mode'] || GameMode.Single;
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

  joinRoom(roomId: string, mode: string, difficulty: string, host: string, target: number = 1) {
    if (!roomId) return;
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.roomId.set(roomId);
    this.hostId.set(host);

    const playerId = this.authStore.currentUser()?.username || this.authStore.guestId;
    
    this.store.joinRoom(roomId, mode, difficulty, host, target);
    
    if (mode !== GameMode.Single) {
      this.roomLifecycle.saveReconnectInfo(roomId, mode, difficulty, host);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.store.leaveRoom();
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
    this.store.joinRoom(
      this.roomId(),
      this.currentRoomMode(),
      this.currentDifficulty(),
      this.hostId()
    );
  }

  

  override handleCreateRoom(config: any) {
    if (config.password) this.wsService.setPendingPassword(config.password);
    const roomId = config.name || `gomoku-${Date.now()}`;
    const host = this.myPlayerId();
    const diff = config.difficulty || 'medium';
    this.joinRoom(roomId, config.mode, diff, host);
    this.isMobileSidebarOpen.set(false);
  }

  override handleJoinRoom(room: any) {
    if (room.password) this.wsService.setPendingPassword(room.password);
    const diff = room.difficulty || 'medium';
    this.joinRoom(room.roomId, room.mode, diff, room.host);
    this.isMobileSidebarOpen.set(false);
  }

  getSubtitle(): string {
    if (this.currentRoomMode() === GameMode.Single) {
      let diffStr = '';
      const diff = this.currentDifficulty();
      if (diff) {
        if (diff === GameDifficulty.Easy) diffStr = this.i18n.t('gomoku.diff.easy')();
        else if (diff === GameDifficulty.Hard) diffStr = this.i18n.t('gomoku.diff.hard')();
        else diffStr = this.i18n.t('gomoku.diff.medium')();
      }
      return this.i18n.t('gomoku.mode.single')() + (diffStr ? ' - ' + diffStr : '');
    } else {
      return this.i18n.t('gomoku.mode.same_pk_classic')();
    }
  }

  onSurrender() {
    this.store.surrender();
  }

  get winnerText(): string {
    const winnerId = this.store.winner();
    if (winnerId === 'tie') return this.i18n.t('gomoku.winner.tie')();
    if (winnerId === this.myPlayerId()) return this.i18n.t('game.you_win')();
    if (this.currentRoomMode() === GameMode.Single && winnerId === 'AI') return this.i18n.t('game.game_over')();
    
    // PvP opponent wins
    const color = this.playerColors()[winnerId!] === 1 ? 'gomoku.winner.black' : 'gomoku.winner.white';
    return this.i18n.t(color)();
  }
}
