import { GameDifficulty, GameId, GameMode, GameStatus } from '../../../core/models/game.model';
import { getSavedDifficulty, setSavedDifficulty } from '../../../core/utils/browser.util';
import { Component, inject, OnInit, OnDestroy, signal, computed, effect, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../core/services/settings.service';
import { ActivatedRoute, Router } from '@angular/router';
import { setupRoomLifecycle, RoomLifecycleHandle } from '../../../core/services/room-lifecycle';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GomokuStore } from './store/gomoku.store';
import { GameRulesModalComponent } from '../../../shared/components/game-rules-modal/game-rules-modal.component';
import { GameLobbyPanelComponent } from '../../../shared/components/game-lobby-panel/game-lobby-panel.component';
import { GameTimerService } from '../../../core/services/game-timer.service';
import { GameService } from '../../../core/services/game.service';
import { AudioService } from '../../../core/services/audio.service';
import { BaseGameComponent } from '../../../core/utils/base-game.component';
import { GameLayoutComponent } from '../../../shared/components/game-layout/game-layout.component';
import { WindowSizeService } from '../../../core/services/window-size.service';
import { boardSizePx } from '../../../core/utils/board-size.util';
import { GomokuAI, type GomokuColor } from './store/gomoku-ai';

import { GameHandheldHeaderComponent } from '../../../shared/components/game-handheld-header/game-handheld-header.component';

@Component({
  selector: 'app-gomoku',
  standalone: true,
  imports: [CommonModule, GameLayoutComponent, GameHandheldHeaderComponent],
  providers: [GomokuStore],
  templateUrl: './gomoku.component.html',
  styleUrls: ['./gomoku.component.css']
})
export class GomokuComponent extends BaseGameComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  override store = inject(GomokuStore);
  private windowSize = inject(WindowSizeService);

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
          if (this.store.winner() === this.myPlayerId()) {
            this.celebrateVictory();
          } else {
            this.vibrateError();
          }
        } else if (this.store.winner() === 'tie') {
          this.audio.playLose(); // fallback for tie or surrender
          this.vibrateMedium();
        }
        setTimeout(() => this.showResultOverlay.set(true), 2000);
      } else {
        this.showResultOverlay.set(false);
      }
    });
  }

  showResultOverlay = signal(false);
  hintMove = signal<[number, number] | null>(null);

  // Responsive Board Size Calculation (standardized via boardSizePx utility)
  readonly boardSizePx = boardSizePx(
    this.windowSize,
    { mobile: 170, tablet: 195, pc: 210 },
    880,
    300,
    { mobile: 20, tablet: 40, pc: 64 },
  );

  // Computed state
  board = this.store.board;
  gameStatus = this.store.status;
  currentTurn = this.store.currentTurn;
  playerColors = this.store.playerColors;
  myPlayerId = this.store.playerId;
  lastMove = computed(() => this.store.lastMove());

  // Move counter
  readonly moveCount = computed(() => {
    const b = this.board();
    let count = 0;
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (b[r][c] !== 0) count++;
      }
    }
    return count;
  });

  readonly moveCountText = computed(() => {
    return this.i18n.t('gomoku.move_count', { count: this.moveCount() })();
  });

  // Opponent name for HUD
  readonly opponentName = computed(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return 'AI ' + this.i18n.t('game.bot')();
    }
    const players = this.mappedPlayers;
    const opponent = players.find(p => p.id !== this.myPlayerId());
    return opponent?.nickname || opponent?.username || opponent?.id || this.i18n.t('game.opponent')();
  });
  
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
      if (joinInfo.isCreate) {
        this.handleCreateRoom(joinInfo);
      } else {
        this.handleJoinRoom(joinInfo);
      }
    } else {
      this.route.queryParams.subscribe(params => {
        if (this.roomId()) {
          return;
        }
        const mode = params['mode'] || GameMode.Single;
        const diff = params['difficulty'] || getSavedDifficulty('gomoku', 'medium');
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

  joinRoom(
    roomId: string,
    mode: string,
    difficulty: string,
    host: string,
    target: number = 1,
    password: string = '',
    bounty: number = 0,
    isSpectator: boolean = false,
    action?: string
  ) {
    if (!roomId) return;
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    this.roomId.set(roomId);
    this.hostId.set(host);

    const finalAction = action || (isSpectator ? 'spectate' : 'join');
    this.wsService.setPendingAction(finalAction);
    this.store.joinRoom(roomId, mode, difficulty, host, target, password, bounty, isSpectator);
    
    if (mode !== GameMode.Single && !isSpectator) {
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
    if (this.hintMove()) {
      this.hintMove.set(null);
    }
    if (this.isMyTurn && this.board()[y]?.[x] === 0) {
      this.vibrateSnap();
    }
    this.store.makeMove(y, x);
  }

  getHint() {
    if (!this.isMyTurn || this.gameStatus() !== GameStatus.Playing) return;
    const currentBoard = this.board();
    const myCol = this.myColor as GomokuColor;
    const ai = new GomokuAI(myCol, GameDifficulty.Medium);
    const best = ai.getBestMove(currentBoard);
    if (best && best[0] >= 0 && best[1] >= 0) {
      this.hintMove.set(best);
      this.audio.playClick();
      // Auto-clear after 6s
      setTimeout(() => {
        if (this.hintMove() === best) {
          this.hintMove.set(null);
        }
      }, 6000);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(e: KeyboardEvent) {
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
    if (e.key === 'r' || e.key === 'R') {
      if (this.currentRoomMode() === GameMode.Single) {
        e.preventDefault();
        this.onRestart();
      }
    } else if (e.key === 'h' || e.key === 'H') {
      if (this.currentRoomMode() === GameMode.Single) {
        e.preventDefault();
        this.getHint();
      }
    }
  }

  onRestart() {
    this.hintMove.set(null);
    this.store.startGame();
  }

  changeDifficulty(event: Event | string) {
    const diff = typeof event === 'string' ? event : (event.target as HTMLSelectElement).value;
    if (diff === this.currentDifficulty()) return;
    setSavedDifficulty('gomoku', diff);
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
    this.wsService.setPendingAction('create');
    const roomId = config.name || config.roomId || `gomoku-${Date.now()}`;
    const host = this.myPlayerId();
    const diff = config.difficulty || 'medium';
    this.joinRoom(
      roomId,
      config.mode,
      diff,
      host,
      config.target ?? 1,
      config.password || '',
      config.bountyCoins || 0,
      false,
      'create'
    );
    this.isMobileSidebarOpen.set(false);
  }

  override handleJoinRoom(room: any) {
    if (room.password) this.wsService.setPendingPassword(room.password);
    const diff = room.difficulty || 'medium';
    const roomId = room.roomId || room.id;
    this.joinRoom(
      roomId,
      room.mode,
      diff,
      room.host,
      room.target ?? 1,
      room.password || '',
      room.bountyCoins || 0,
      room.isSpectator || false
    );
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
