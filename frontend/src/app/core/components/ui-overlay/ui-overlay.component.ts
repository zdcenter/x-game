import { Component, inject, computed, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService, GameInviteBanner } from '../../services/toast.service';
import { I18nService } from '../../i18n/i18n.service';
import { WebSocketService } from '../../services/websocket.service';
import { AuthStore } from '../../auth/auth.store';
import { CrossGameJoinService } from '../../services/cross-game-join.service';
import { GameRegistryService } from '../../services/game-registry.service';

@Component({
  selector: 'app-ui-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Opponent Disconnected Grace Period Capsule (Shown to remaining player in-game) -->
    @if (opponentDisconnect(); as dis) {
      <div class="fixed top-3 left-1/2 -translate-x-1/2 z-[100001] w-[calc(100vw-24px)] max-w-md bg-amber-500/95 dark:bg-amber-600/95 text-white border-2 border-amber-300 dark:border-amber-400 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.5)] p-3 flex items-center justify-between gap-3 animate-slide-in backdrop-blur-md pointer-events-auto">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="relative flex h-3 w-3 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-black truncate flex items-center gap-1">
              <span>⚠️ {{ i18n.t('game.pk_opponent_disconnected_title')() || '对手暂时断开连接' }}</span>
            </p>
            <p class="text-[11px] text-amber-100 truncate">
              {{ i18n.t('game.pk_opponent_disconnected_desc', { player: dis.playerId, seconds: dis.remaining })() || ('对手【' + dis.playerId + '】席位保留中，等待重连: ' + dis.remaining + 's') }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="px-2.5 py-1 rounded-xl bg-black/25 text-white font-mono text-xs font-bold border border-white/20">
            {{ dis.remaining }}s
          </span>
        </div>
      </div>
    }

    <!-- Sticky Floating Active Battle Reconnect Capsule -->
    @if (ongoingMatch(); as active) {
      <div class="fixed top-3 left-1/2 -translate-x-1/2 z-[100001] w-[calc(100vw-24px)] max-w-md bg-[var(--color-bg-card)]/95 border-2 border-emerald-400 dark:border-emerald-500 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.35)] p-3 flex items-center justify-between gap-3 animate-slide-in backdrop-blur-md pointer-events-auto">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="relative flex h-3 w-3 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-black text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1">
              <span>⚔️ 您有一场进行中的对决！</span>
            </p>
            <p class="text-[11px] text-[var(--color-text-muted)] truncate">
              {{ active.gameTitle }} · 房间 #{{ active.room.id }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button (click)="returnToOngoingMatch(active)" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1">
            <span>⚡</span>
            <span>返回对决</span>
          </button>
          <button (click)="dismissOngoingMatch(active.room.id)" class="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-sm transition-colors cursor-pointer" title="隐藏提示">
            ✕
          </button>
        </div>
      </div>
    }

    <!-- Non-blocking Floating Battle Challenge Capsule -->
    @if (toastService.activeInvite(); as invite) {
      <div class="fixed top-4 right-4 sm:top-6 sm:right-6 z-[100000] max-w-sm w-[calc(100vw-32px)] sm:w-auto bg-[var(--color-bg-card)] border-2 border-amber-400/80 rounded-2xl shadow-2xl p-3.5 flex items-center justify-between gap-3 animate-slide-in backdrop-blur-md pointer-events-auto">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-2xl animate-bounce shrink-0">⚔️</span>
          <div class="min-w-0">
            <p class="text-xs font-black text-[var(--color-text-main)] truncate">
              {{ i18n.t('game.invite_duel_title', { name: invite.senderName })() || (invite.senderName + ' 邀请你对决！') }}
            </p>
            <p class="text-[11px] text-[var(--color-text-muted)] truncate">{{ invite.gameTitle }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button (click)="acceptInvite(invite)" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer">
            ⚡ {{ i18n.t('game.accept_duel')() || '应战' }}
          </button>
          <button (click)="dismissInvite()" class="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-sm transition-colors cursor-pointer" [title]="i18n.t('game.close')() || '关闭'">
            ✕
          </button>
        </div>
      </div>
    }

    <!-- Toasts -->
    <div class="fixed top-20 right-4 z-[9999] flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="px-4 py-3 rounded-lg shadow-lg text-sm font-bold text-white transition-all transform animate-slide-in"
             [class.bg-emerald-500]="toast.type === 'success'"
             [class.bg-red-500]="toast.type === 'error'"
             [class.bg-blue-500]="toast.type === 'info'">
          {{ toast.message }}
        </div>
      }
    </div>

    <!-- Confirm Dialog -->
    @if (toastService.currentConfirm(); as dialog) {
      <div class="fixed inset-0 z-[9999] bg-[var(--color-overlay)] backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform animate-scale-in text-[var(--color-text-main)]">
          <div class="p-6">
            <h3 class="text-lg font-bold mb-2">{{ dialog.title }}</h3>
            <p class="opacity-70 text-sm leading-relaxed mb-6">{{ dialog.message }}</p>
            <div class="flex gap-3">
              <button (click)="cancelConfirm(dialog)" class="flex-1 py-2.5 rounded-xl font-bold bg-[var(--color-bg-card)] opacity-80 hover:opacity-100 border border-[var(--color-border-card)] transition-colors">
                {{ dialog.cancelText || 'Cancel' }}
              </button>
              <button (click)="acceptConfirm(dialog)" 
                      class="flex-1 py-2.5 rounded-xl font-bold transition-colors shadow-lg"
                      [class.bg-red-500]="dialog.confirmStyle !== 'primary'"
                      [class.text-white]="dialog.confirmStyle !== 'primary'"
                      [class.hover:bg-red-400]="dialog.confirmStyle !== 'primary'"
                      [class.shadow-red-500/20]="dialog.confirmStyle !== 'primary'"
                      [class.bg-blue-500]="dialog.confirmStyle === 'primary'"
                      [class.text-white]="dialog.confirmStyle === 'primary'"
                      [class.hover:bg-blue-400]="dialog.confirmStyle === 'primary'"
                      [class.shadow-blue-500/20]="dialog.confirmStyle === 'primary'">
                {{ dialog.confirmText || 'Confirm' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in { animation: slide-in 0.2s ease-out forwards; }
    
    @keyframes scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
  `]
})
export class UiOverlayComponent implements OnDestroy {
  toastService = inject(ToastService);
  i18n = inject(I18nService);
  private readonly wsService = inject(WebSocketService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  private readonly crossGameJoin = inject(CrossGameJoinService);
  private readonly gameRegistry = inject(GameRegistryService);

  readonly dismissedMatchRoomId = signal<string | null>(null);
  readonly opponentDisconnect = signal<{ playerId: string; remaining: number } | null>(null);
  private opponentCountdownTimer?: any;

  constructor() {
    // 监听对手断开连接事件
    effect(() => {
      const dis = this.wsService.playerDisconnectedEvent();
      if (dis) {
        const myName = (this.auth.currentUser()?.username || this.auth.guestId || '').toLowerCase().trim();
        if (dis.playerId.toLowerCase().trim() !== myName) {
          const secs = dis.gracePeriod || 30;
          this.startOpponentCountdown(dis.playerId, secs);
          const toastMsg = this.i18n.t('game.pk_opponent_disconnected_toast', { player: dis.playerId, seconds: secs })()
            || `对手【${dis.playerId}】暂时断开连接，系统为其保留 ${secs} 秒席位，请稍候...`;
          this.toastService.warning(toastMsg);
        }
      } else {
        this.clearOpponentCountdown();
      }
    });

    // 监听对手重新连接事件
    effect(() => {
      const rec = this.wsService.playerReconnectedEvent();
      if (rec) {
        const myName = (this.auth.currentUser()?.username || this.auth.guestId || '').toLowerCase().trim();
        if (rec.toLowerCase().trim() !== myName) {
          this.clearOpponentCountdown();
          const toastMsg = this.i18n.t('game.pk_opponent_reconnected_toast', { player: rec })()
            || `对手【${rec}】已恢复连接，战斗继续！`;
          this.toastService.success(toastMsg);
        }
      }
    });

    // 监听玩家主动退出或弃赛认输事件
    effect(() => {
      const left = this.wsService.playerLeftEvent();
      if (left) {
        const myName = (this.auth.currentUser()?.username || this.auth.guestId || '').toLowerCase().trim();
        if (left.playerId.toLowerCase().trim() !== myName) {
          this.clearOpponentCountdown();
          if (left.reason === 'forfeit' || left.reason === 'timeout') {
            const toastMsg = this.i18n.t('game.pk_opponent_forfeited_toast', { player: left.playerId })()
              || `对手【${left.playerId}】已认输离开，恭喜您获得对决胜利！`;
            this.toastService.success(toastMsg);
          } else {
            const toastMsg = this.i18n.t('game.pk_player_left_toast', { player: left.playerId })()
              || `玩家【${left.playerId}】退出了房间`;
            this.toastService.info(toastMsg);
          }
        }
      }
    });

    // 监听房主转移事件
    effect(() => {
      const host = this.wsService.hostChangedEvent();
      if (host) {
        const myName = (this.auth.currentUser()?.username || this.auth.guestId || '').toLowerCase().trim();
        if (host.oldHost.toLowerCase().trim() !== myName) {
          const toastMsg = this.i18n.t('game.pk_host_changed_toast', { oldHost: host.oldHost, newHost: host.newHost })()
            || `房主已转移：【${host.newHost}】成为新房主`;
          this.toastService.info(toastMsg);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.clearOpponentCountdown();
  }

  private startOpponentCountdown(playerId: string, seconds: number) {
    this.clearOpponentCountdown();
    this.opponentDisconnect.set({ playerId, remaining: seconds });
    this.opponentCountdownTimer = setInterval(() => {
      const cur = this.opponentDisconnect();
      if (!cur || cur.remaining <= 1) {
        this.clearOpponentCountdown();
      } else {
        this.opponentDisconnect.set({ playerId: cur.playerId, remaining: cur.remaining - 1 });
      }
    }, 1000);
  }

  private clearOpponentCountdown() {
    if (this.opponentCountdownTimer) {
      clearInterval(this.opponentCountdownTimer);
      this.opponentCountdownTimer = undefined;
    }
    this.opponentDisconnect.set(null);
  }

  readonly ongoingMatch = computed(() => {
    const user = this.auth.currentUser()?.username || this.auth.guestId;
    if (!user) return null;
    const clean = (s: string) => (s || '').toLowerCase().trim();
    const u = clean(user);

    // If already on a game page, don't show the global re-entry bar
    const currentUrl = this.router.url || '';
    if (currentUrl.includes('/games/')) {
      return null;
    }

    const rooms = this.wsService.activeRooms() || [];
    const match = rooms.find((r: any) => {
      if (!r || (r.status !== 'playing' && r.status !== 'starting')) return false;
      if (this.dismissedMatchRoomId() === r.id) return false;
      const isContestant = clean(r.host) === u || clean(r.opponent) === u ||
        (Array.isArray(r.contestants) && r.contestants.some((c: string) => clean(c) === u)) ||
        (Array.isArray(r.playersList) && r.playersList.some((c: string) => clean(c) === u));
      return isContestant;
    });

    if (!match) return null;

    const gameConfig = this.gameRegistry.getConfig(match.game);
    const gameTitleKey = gameConfig?.titleKey || `lobby.${match.game}`;
    const gameTitle = this.i18n.t(gameTitleKey)() || match.game;

    return {
      room: match,
      gameTitle
    };
  });

  returnToOngoingMatch(match: any) {
    const room = match.room;
    this.crossGameJoin.setPendingJoin({
      game: room.game,
      roomId: room.id,
      mode: room.mode,
      difficulty: room.difficulty,
      host: room.host,
      action: 'join',
      spectate: false,
    });
    const lang = this.i18n.currentLang() || 'zh';
    this.router.navigate([`/${lang}/games/${room.game}`]);
  }

  dismissOngoingMatch(roomId: string) {
    this.dismissedMatchRoomId.set(roomId);
  }

  acceptInvite(invite: GameInviteBanner) {
    this.toastService.dismissInvite();
    if (invite?.onAccept) {
      try {
        invite.onAccept();
      } catch (e) {
        console.error('Error accepting duel invite:', e);
      }
    }
  }

  dismissInvite() {
    this.toastService.dismissInvite();
  }

  acceptConfirm(dialog: any) {
    dialog.onConfirm();
    this.toastService.closeConfirm();
  }

  cancelConfirm(dialog: any) {
    if (dialog.onCancel) {
      dialog.onCancel();
    }
    this.toastService.closeConfirm();
  }
}
