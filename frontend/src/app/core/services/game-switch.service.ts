import { Injectable, signal, inject } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { GameRegistryService } from './game-registry.service';
import { C2SAction } from '../models/websocket.model';
import { GameMode } from '../models/game.model';
import { Router } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';

export interface GameSwitchOptions {
  roomId?: string;
  currentGameId?: string;
  currentDifficulty?: string;
  currentMode?: string;
  isPkMatch?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameSwitchService {
  private ws = inject(WebSocketService);
  private gameRegistry = inject(GameRegistryService);
  private router = inject(Router);
  private i18n = inject(I18nService);

  readonly isOpen = signal<boolean>(false);
  readonly options = signal<GameSwitchOptions>({});

  open(opts: GameSwitchOptions = {}) {
    this.options.set(opts);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  executeSwitch(targetGameId: string, difficulty: string, mode?: string) {
    const opts = this.options();
    const isPk = opts.isPkMatch !== false && !!(opts.roomId || this.ws.currentRoomId() || this.ws.gameState()?.roomId);

    if (isPk) {
      // PK Match: Send ActionChangeGame to WebSocket so room & opponent switch together
      const targetConfig = this.gameRegistry.getConfig(targetGameId);
      let targetMode = mode || opts.currentMode || 'speed';
      let targetDiff = difficulty || opts.currentDifficulty || 'medium';

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
        action: C2SAction.ChangeGame,
        type: C2SAction.ChangeGame,
        roomId: opts.roomId || this.ws.currentRoomId() || this.ws.gameState()?.roomId,
        game: targetGameId,
        mode: targetMode,
        difficulty: targetDiff
      });
    } else {
      // Single Player Mode: Navigate directly to the selected game and difficulty
      const lang = this.i18n.currentLang();
      this.router.navigate(['/', lang, 'games', targetGameId], {
        queryParams: { difficulty }
      });
    }

    this.close();
  }
}
