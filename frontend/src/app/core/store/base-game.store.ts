import { Injectable, computed, inject, signal } from '@angular/core';
import { WebSocketService } from '../services/websocket.service';
import { AuthStore } from '../auth/auth.store';
import { GameStoreInterface } from '../interfaces/game-store.interface';
import { GameMode, GameModeType, GameDifficulty, GameDifficultyType, GameStatusType, GameStatus } from '../models/game.model';
import { C2SAction } from '../models/websocket.model';

@Injectable()
export abstract class BaseGameStore implements GameStoreInterface {
  readonly ws = inject(WebSocketService);
  readonly auth = inject(AuthStore);

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

  // 子类必须实现，因为不同游戏计算玩家列表和游戏状态的方式（尤其在竞速和抢分模式下）有所不同
  abstract readonly playersList: import('@angular/core').Signal<any[]>;
  abstract readonly status: import('@angular/core').Signal<GameStatusType | string>;

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
    this.ws.send({ action: C2SAction.StartGame });
  }

  restartGame() {
    this.ws.send({ type: C2SAction.RestartGame });
  }

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
