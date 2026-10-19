import { Injectable, inject, computed, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { WebSocketService } from './websocket.service';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../i18n/i18n.service';
import { GameRegistryService } from './game-registry.service';
import { CrossGameJoinService } from './cross-game-join.service';
import { ToastService } from './toast.service';
import { isBrowser } from '../utils/browser.util';
import { GameMode, GameDifficulty } from '../models/game.model';

export interface WaitingRoom {
  id: string;
  game: string;
  host: string;
  players: number;
  mode: string;
  difficulty: string;
  status: string;
  createdAt: number;
  hasPassword?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LiveRoomService {
  private ws = inject(WebSocketService);
  private auth = inject(AuthStore);
  private router = inject(Router);
  private i18n = inject(I18nService);
  private registry = inject(GameRegistryService);
  private crossJoin = inject(CrossGameJoinService);
  private toast = inject(ToastService);

  readonly currentUserId = computed(() => this.auth.currentUser()?.username || this.auth.guestId);

  // Filter only valid waiting rooms (multiplayer, status=waiting)
  readonly waitingRooms = computed<WaitingRoom[]>(() => {
    const raw = this.ws.activeRooms() || [];
    return raw
      .filter((r: any) => r && r.status === 'waiting' && r.mode !== GameMode.Single)
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  });

  readonly waitingCount = computed(() => this.waitingRooms().length);
  readonly hasWaitingRooms = computed(() => this.waitingCount() > 0);

  // Popover state for navbar
  readonly isBeaconOpen = signal(false);

  // In-game dynamic challenge alert
  readonly newRoomAlert = signal<WaitingRoom | null>(null);
  private alertTimer: any = null;
  private knownRoomIds = new Set<string>();

  constructor() {
    if (isBrowser()) {
      // Monitor new rooms for in-game / live notifications
      effect(() => {
        const rooms = this.waitingRooms();
        const myId = this.currentUserId();
        
        for (const room of rooms) {
          if (!this.knownRoomIds.has(room.id)) {
            this.knownRoomIds.add(room.id);
            // Trigger alert if not my own room and created recently (within last 30s)
            const isRecent = !room.createdAt || (Date.now() / 1000 - room.createdAt) < 30;
            if (room.host !== myId && isRecent) {
              this.triggerNewRoomAlert(room);
              break;
            }
          }
        }
      });
    }
  }

  /**
   * Initializes or keeps the global lobby connection active
   */
  ensureLobbyConnected() {
    if (!isBrowser()) return;
    const player = this.currentUserId();
    if (player) {
      this.ws.connectLobby(player, player);
    }
  }

  toggleBeacon(open?: boolean) {
    this.isBeaconOpen.update(v => open !== undefined ? open : !v);
  }

  private triggerNewRoomAlert(room: WaitingRoom) {
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
    }
    this.newRoomAlert.set(room);
    this.alertTimer = setTimeout(() => {
      this.newRoomAlert.set(null);
      this.alertTimer = null;
    }, 8000);
  }

  dismissAlert() {
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
    this.newRoomAlert.set(null);
  }

  quickJoin(room: WaitingRoom) {
    if (room.hasPassword) {
      // If password protected, navigate to arena to enter password
      const lang = this.i18n.currentLang() || 'zh';
      this.router.navigate([`/${lang}/pk-arena`], { queryParams: { room: room.id } });
      return;
    }

    this.crossJoin.setPendingJoin({
      game: room.game,
      roomId: room.id,
      mode: room.mode,
      difficulty: room.difficulty,
      host: room.host
    });

    const lang = this.i18n.currentLang() || 'zh';
    this.isBeaconOpen.set(false);
    this.dismissAlert();

    const gameTitle = this.getGameTitle(room.game);
    this.toast.show(`${this.i18n.t('lobby.quick_join')()}: ${gameTitle}`, 'info');

    const targetUrl = `/${lang}/games/${room.game}`;
    if (this.router.url === targetUrl) {
      // If already on the same game page, reload component
      this.router.navigateByUrl(`/${lang}`, { skipLocationChange: true }).then(() => {
        this.router.navigate([targetUrl]);
      });
    } else {
      this.router.navigate([targetUrl]);
    }
  }

  // --- Aesthetic Helpers & Labels ---
  getGameEmoji(gameId: string): string {
    switch (gameId) {
      case 'minesweeper': return '💣';
      case 'sudoku': return '🔢';
      case 'sliding': return '🔲';
      case 'hexa': return '🔶';
      case 'tetris': return '🧱';
      case 'gomoku': return '⚫⚪';
      case 'codebreaker': return '🔐';
      case 'math24': return '🧮';
      case 'drop2048': return '🧊';
      case 'block': return '🟩';
      case 'lightsout': return '💡';
      case 'watersort': return '🧪';
      case 'sokoban': return '📦';
      case 'idiom': return '📖';
      case 'nonogram': return '🎨';
      case 'classic2048': return '🔢';
      case 'connect': return '🔗';
      case 'hashi': return '🌉';
      default: return '🎮';
    }
  }

  getGameTitle(gameId: string): string {
    const config = this.registry.getConfig(gameId);
    if (config?.titleKey) {
      const translated = this.i18n.t(config.titleKey)();
      if (translated) return translated;
    }
    return gameId;
  }

  getModeInfo(gameId: string): { icon: string; label: string; gradient: string; shadow: string } {
    if (gameId === 'gomoku') {
      return {
        icon: '♟️',
        label: this.i18n.t('lobby.pk_btn_duel')() || '经典对弈',
        gradient: 'var(--gradient-pk-duel)',
        shadow: 'var(--shadow-pk-duel)'
      };
    }
    if (gameId === 'tetris') {
      return {
        icon: '💥',
        label: this.i18n.t('lobby.pk_btn_battle')() || '攻防对抗',
        gradient: 'var(--gradient-pk-battle)',
        shadow: 'var(--shadow-pk-battle)'
      };
    }
    if (gameId === 'idiom') {
      return {
        icon: '📖',
        label: this.i18n.t('lobby.pk_btn_word')() || '接龙对决',
        gradient: 'var(--gradient-pk-word)',
        shadow: 'var(--shadow-pk-word)'
      };
    }
    const config = this.registry.getConfig(gameId);
    const pkMode = config?.modes?.find(m => m.id !== GameMode.Single);
    const modeId = pkMode?.id;
    if (modeId === GameMode.Score || modeId === GameMode.SameScore || ['hexa', 'block', 'drop2048', 'classic2048'].includes(gameId)) {
      return {
        icon: '🏆',
        label: this.i18n.t('lobby.pk_btn_score')() || '抢分对抗',
        gradient: 'var(--gradient-pk-score)',
        shadow: 'var(--shadow-pk-score)'
      };
    }
    return {
      icon: '⚡',
      label: this.i18n.t('lobby.pk_btn_speed')() || '竞速对决',
      gradient: 'var(--gradient-pk-speed)',
      shadow: 'var(--shadow-pk-speed)'
    };
  }

  getDifficultyLabel(gameId: string, diffId: string): string {
    const cfg = this.registry.getConfig(gameId);
    const diff = cfg?.difficulties?.find(d => d.id === diffId);
    if (diff?.labelKey) {
      const translated = this.i18n.t(diff.labelKey)();
      if (translated) return translated;
    }
    if (diffId === GameDifficulty.Easy) return this.i18n.t('game.diff_easy')() || '简单';
    if (diffId === GameDifficulty.Medium) return this.i18n.t('game.diff_medium')() || '普通';
    if (diffId === GameDifficulty.Hard) return this.i18n.t('game.diff_hard')() || '困难';
    return diffId;
  }

  getTimeAgo(createdAt?: number): string {
    if (!createdAt) return this.i18n.t('lobby.created_just_now')() || '刚刚';
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - createdAt);
    if (diff < 15) return this.i18n.t('lobby.created_just_now')() || '刚刚';
    if (diff < 60) return `${diff}s`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  }
}
