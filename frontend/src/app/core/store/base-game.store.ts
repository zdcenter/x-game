import { Injectable, computed, inject, signal } from '@angular/core';
import { WebSocketService } from '../services/websocket.service';
import { AuthStore } from '../auth/auth.store';
import { GameStoreInterface } from '../interfaces/game-store.interface';
import { GameMode, GameModeType, GameDifficulty, GameDifficultyType, GameStatusType, GameStatus } from '../models/game.model';
import { C2SAction, MessageType } from '../models/websocket.model';
import { GameRegistryService } from '../services/game-registry.service';

@Injectable()
export abstract class BaseGameStore implements GameStoreInterface {
  readonly ws = inject(WebSocketService);
  readonly auth = inject(AuthStore);
  readonly gameRegistry = inject(GameRegistryService);

  readonly roomId = signal<string>('');
  readonly currentRoomMode = signal<GameModeType | string>(GameMode.Single);
  readonly currentDifficulty = signal<GameDifficultyType | string>(GameDifficulty.Medium);

  readonly playerId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);

  // Derive all state from the WebSocketService's global gameState
  protected rawState = computed(() => this.ws.gameState());

  // Default implementations for aliases required by GameStoreInterface
  readonly hostId = computed<string>(() => {
    if (this.currentRoomMode() === GameMode.Single) return this.playerId();
    const s = this.rawState() as any;
    return s ? (s.host || '') : '';
  });

  readonly readyPlayers = computed<Record<string, boolean>>(() => (this.rawState() as any)?.readyPlayers || {});

  // 子类必须提供游戏ID用于 websocket 路由
  abstract readonly gameId: string;

  // 子类实现单机状态、单机玩家列表、单机获胜者列表
  abstract readonly singlePlayerStatus: import('@angular/core').Signal<GameStatusType | string>;
  abstract readonly singlePlayerList: import('@angular/core').Signal<any[]>;
  abstract readonly singlePlayerWinners: import('@angular/core').Signal<string[]>;

  readonly playersList = computed<any[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return this.singlePlayerList();
    }
    const players = (this.rawState() as any)?.players;
    if (!players) return [];
    // Ensure id is present in the object
    return Object.keys(players).map(k => ({ id: k, ...players[k] }));
  });

  readonly winners = computed<string[]>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return this.singlePlayerWinners();
    }
    return (this.rawState() as any)?.winners || [];
  });

  readonly status = computed<GameStatusType | string>(() => {
    if (this.currentRoomMode() === GameMode.Single) {
      return this.singlePlayerStatus();
    }
    const st = this.rawState() as any;
    if (!st) return GameStatus.Waiting;
    let s = st.status;
    if (typeof s === 'number') {
      const statusMap: any[] = [GameStatus.Waiting, GameStatus.Starting, GameStatus.Playing, GameStatus.Finished];
      return statusMap[s] || 'waiting';
    }
    return s || 'waiting';
  });

  readonly isWaiting = computed(() => this.status() === GameStatus.Waiting);
  readonly isStarting = computed(() => this.status() === GameStatus.Starting);
  readonly isPlaying = computed(() => this.status() === GameStatus.Playing);
  readonly isFinished = computed(() => this.status() === GameStatus.Finished);

  joinRoom(roomId: string, mode: GameModeType | string = GameMode.Single, difficulty: GameDifficultyType | string = GameDifficulty.Medium, hostId?: string) {
    this.roomId.set(roomId);
    this.currentRoomMode.set(mode);
    this.currentDifficulty.set(difficulty);
    if (mode !== GameMode.Single) {
      this.ws.connect(this.gameId, roomId, this.playerId(), mode as string, difficulty as string, hostId);
    }
  }

  leaveRoom() {
    if (this.currentRoomMode() !== GameMode.Single) {
      this.ws.send({ type: C2SAction.LeaveRoom });
    }
    // Give it a tiny delay to ensure the message is sent before the connection closes
    setTimeout(() => {
      this.ws.disconnect(this.gameId);
    }, 100);
    this.roomId.set('');
    this.currentRoomMode.set(GameMode.Single);
  }

  startGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.onSinglePlayerStart();
    } else {
      this.ws.send({ action: C2SAction.StartGame });
    }
  }

  restartGame() {
    if (this.currentRoomMode() === GameMode.Single) {
      this.onSinglePlayerRestart();
      return;
    }
    this.ws.send({
      type: MessageType.Room,
      action: C2SAction.RestartGame
    });
  }

  changeRoomGame(targetGameId: string) {
    if (this.currentRoomMode() === GameMode.Single) return;
    
    const targetConfig = this.gameRegistry.getConfig(targetGameId);
    let targetMode = this.currentRoomMode() as string;
    let targetDiff = this.currentDifficulty() as string;
    
    if (targetConfig) {
       if (!targetConfig.modes.some(m => m.id === targetMode)) {
         const mpMode = targetConfig.modes.find(m => m.id !== GameMode.Single);
         targetMode = mpMode ? mpMode.id : targetConfig.modes[0].id;
       }
       if (!targetConfig.difficulties.some(d => d.id === targetDiff)) {
         targetDiff = targetConfig.difficulties[0].id;
       }
    }

    this.ws.send({
      type: MessageType.Room,
      action: C2SAction.ChangeGame,
      payload: { game: targetGameId, mode: targetMode, difficulty: targetDiff }
    });
  }

  // 子类实现单机游戏的开始和重置逻辑
  protected onSinglePlayerStart() {}
  protected onSinglePlayerRestart() {}

  dismissRoom() {
    this.ws.send({ type: C2SAction.DismissRoom });
  }

  ready() {
    this.ws.send({ type: C2SAction.Ready });
  }

  cancelReady() {
    this.ws.send({ type: C2SAction.CancelReady });
  }

  kickPlayer(playerId: string) {
    this.ws.send({ type: C2SAction.KickPlayer, target: playerId });
  }
}
