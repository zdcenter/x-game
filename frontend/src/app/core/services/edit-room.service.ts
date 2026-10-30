import { Injectable, inject, signal } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';
import { EditRoomConfig } from '../../shared/components/edit-room-overlay/edit-room-overlay.component';
import { C2SAction } from '../models/websocket.model';

@Injectable({ providedIn: 'root' })
export class EditRoomService {
  private ws    = inject(WebSocketService);
  private toast = inject(ToastService);
  private i18n  = inject(I18nService);

  isOpen      = signal(false);
  gameId      = signal('');
  mode        = signal('');
  difficulty  = signal('');
  target      = signal(1);
  bountyCoins = signal(0);
  private roomId = '';

  open(params: { roomId: string; gameId: string; mode: string; difficulty: string; target?: number; bountyCoins?: number }) {
    this.roomId = params.roomId;
    this.gameId.set(params.gameId);
    this.mode.set(params.mode);
    this.difficulty.set(params.difficulty);
    this.target.set(params.target ?? 1);
    this.bountyCoins.set(params.bountyCoins ?? 0);
    this.isOpen.set(true);
  }

  close() { this.isOpen.set(false); }

  apply(cfg: EditRoomConfig) {
    this.ws.send({
      action: C2SAction.ChangeGame,
      roomId: this.roomId,
      game: cfg.gameId,
      mode: cfg.mode,
      difficulty: cfg.difficulty,
      target: cfg.target,
      bountyCoins: cfg.bountyCoins ?? 0,
    });
    this.close();
    this.toast.show(this.i18n.t('game.update_settings')() + ' ✓', 'success');
  }
}
