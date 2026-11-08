import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, Input, Output, EventEmitter, inject, signal, computed, input, OnInit, OnDestroy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { ShareService } from '../../../core/services/share.service';
import { getHref } from '../../../core/utils/browser.util';
import { AudioService } from '../../../core/services/audio.service';
import { FriendService } from '../../../core/services/friend.service';
import { ToastService } from '../../../core/services/toast.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { GameSwitchService } from '../../../core/services/game-switch.service';
import { C2SAction } from '../../../core/models/websocket.model';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-game-waiting-room',
  standalone: true,
  imports: [CommonModule],
  host: {
    'class': 'flex w-full sm:h-full min-h-0 flex-col'
  },
  templateUrl: './game-waiting-room.component.html',
})
export class GameWaitingRoomComponent implements OnInit, OnDestroy {
  GameMode = GameMode;
  i18n = inject(I18nService);
  gameRegistry = inject(GameRegistryService);
  audioService = inject(AudioService);
  friendService = inject(FriendService);
  toast = inject(ToastService);
  private ws = inject(WebSocketService);
  private gameSwitchService = inject(GameSwitchService);

  constructor() {
    effect(() => {
      const gsDiff = this.ws.gameState()?.difficulty;
      const wsDiff = this.ws.currentDifficulty();
      const newDiff = gsDiff || wsDiff;
      if (newDiff && newDiff !== this.difficulty) {
        untracked(() => {
          this.difficulty = newDiff;
        });
      }

      const gsMode = this.ws.gameState()?.mode;
      const wsMode = this.ws.currentMode();
      const newMode = gsMode || wsMode;
      if (newMode && newMode !== this.mode) {
        untracked(() => {
          this.mode = newMode;
        });
      }
    });
  }

  openSwitchGame() {
    this.gameSwitchService.open({
      roomId: this.roomId,
      currentGameId: this.gameId,
      currentDifficulty: this.difficulty,
      currentMode: this.mode,
      isPkMatch: true
    });
  }

  @Input({ required: true }) gameId!: string;
  @Input({ required: true }) mode!: string;
  @Input({ required: true }) difficulty!: string;
  @Input({ required: true }) roomId!: string;
  @Input({ required: true }) players!: any[];
  @Input({ required: true }) hostId!: string;
  @Input({ required: true }) currentUserId!: string;
  @Input() readyPlayers: Record<string, boolean> = {};
  target = input<number>(1);

  @Output() leave = new EventEmitter<void>();
  @Output() start = new EventEmitter<void>();
  @Output() changeSettings = new EventEmitter<void>();
  @Output() kick = new EventEmitter<string>();
  @Output() ready = new EventEmitter<void>();
  @Output() cancelReady = new EventEmitter<void>();
  @Output() difficultyChange = new EventEmitter<string>();
  @Output() modeChange = new EventEmitter<string>();

  shareService = inject(ShareService);

  qrCodeUrl = signal<string>('');

  availableDifficulties = computed(() => {
    const cfg = this.gameRegistry.getConfig(this.gameId);
    return cfg?.difficulties || [];
  });

  availableModes = computed(() => {
    const cfg = this.gameRegistry.getConfig(this.gameId);
    return (cfg?.modes || []).filter(m => m.id !== GameMode.Single);
  });

  changeMode(newMode: string) {
    if (this.currentUserId !== this.hostId || this.mode === newMode) return;
    this.audioService.playClick();
    this.mode = newMode;
    this.modeChange.emit(newMode);
    this.ws.send({
      action: C2SAction.ChangeGame,
      roomId: this.roomId,
      game: this.gameId,
      mode: newMode,
      difficulty: this.difficulty,
      target: this.target(),
      bountyCoins: 0
    });
    const label = this.getModeName(newMode);
    this.toast.show((this.i18n.t('game.mode')() || '游戏模式') + `: ${label} ✓`, 'success');
  }

  changeDifficulty(newDiff: string) {
    if (this.currentUserId !== this.hostId || this.difficulty === newDiff) return;
    this.audioService.playClick();
    this.difficulty = newDiff;
    this.difficultyChange.emit(newDiff);
    this.ws.send({
      action: C2SAction.ChangeGame,
      roomId: this.roomId,
      game: this.gameId,
      mode: this.mode,
      difficulty: newDiff,
      target: this.target(),
      bountyCoins: 0
    });
    const label = this.getDifficultyLabel(newDiff);
    this.toast.show((this.i18n.t('game.difficulty')() || '难度') + `: ${label} ✓`, 'success');
  }

  getModeIcon(modeId: string): string {
    const cfg = this.gameRegistry.getConfig(this.gameId);
    const m = cfg?.modes?.find(item => item.id === modeId);
    if (m?.icon) return m.icon;
    if (modeId.includes(GameMode.Steal)) return '💣';
    if (modeId.includes(GameMode.Speed)) return '🏎️';
    return '⚔️';
  }

  getDifficultyLabel(diffId: string): string {
    if (!diffId) return '';
    const key = this.gameRegistry.getDifficultyLabel(this.gameId, diffId);
    if (key) {
      const trans = this.i18n.t(key)();
      if (trans) return trans;
    }
    return diffId;
  }

  get sortedPlayers() {
    if (!this.players) return [];
    return [...this.players].sort((a, b) => {
      if (a.id === this.hostId) return -1;
      if (b.id === this.hostId) return 1;
      return 0;
    });
  }

  get maxCapacity(): number {
    return this.gameRegistry.getMaxPlayers(this.gameId);
  }

  get isStrictlyDual(): boolean {
    return this.gameRegistry.isStrictlyDual(this.gameId);
  }

  get stageLayout(): 'dual' | 'squad' | 'grand' {
    if (this.isStrictlyDual) return 'dual';
    const count = this.sortedPlayers.length;
    if (count <= 2) return 'dual';
    if (count <= 4) return 'squad';
    return 'grand';
  }

  get dynamicArenaBadge(): string {
    if (this.isStrictlyDual) {
      return this.i18n.t('game.duel_mode')() || '1v1 棋盘对弈';
    }
    const count = this.sortedPlayers.length;
    if (count <= 2) {
      return this.mode?.includes(GameMode.Speed) ? '1v1 极速竞速' : '1v1 巅峰对决';
    }
    if (count <= 4) {
      return `🏎️ ${count}人 同台竞速`;
    }
    return `🔥 ${count}人 群雄大乱斗`;
  }

  get dynamicSeatCountLabel(): string {
    if (this.isStrictlyDual) {
      return `${this.sortedPlayers.length}/2`;
    }
    const count = this.sortedPlayers.length;
    if (count <= 1) return `1人等待中`;
    if (count === 2) return `2人已入席`;
    if (count <= 4) return `${count}人对决席`;
    return `${count}人大乱斗`;
  }

  get squadEmptySlots(): number[] {
    const current = this.sortedPlayers.length;
    if (current >= 4) return [];
    return Array.from({ length: 4 - current }, (_, i) => i);
  }

  getPlayerGradient(index: number): string {
    const gradients = [
      'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      'linear-gradient(135deg, #f43f5e, #f97316)',
      'linear-gradient(135deg, #10b981, #06b6d4)',
      'linear-gradient(135deg, #f59e0b, #eab308)',
      'linear-gradient(135deg, #ec4899, #8b5cf6)',
      'linear-gradient(135deg, #06b6d4, #3b82f6)',
      'linear-gradient(135deg, #84cc16, #10b981)',
      'linear-gradient(135deg, #a855f7, #ec4899)',
    ];
    return gradients[index % gradients.length];
  }

  get isSpectator(): boolean {
    return !this.players.some(p => p.id === this.currentUserId);
  }

  get allGuestsReady(): boolean {
    if (!this.players) return false;
    const guests = this.players.filter(p => p.id !== this.hostId);
    if (guests.length === 0 && this.mode !== GameMode.Single) return false; // Must have at least 1 guest in PK
    return guests.every(g => this.readyPlayers[g.id]);
  }

  getModeName(modeId: string): string {
    if (!modeId) return '';
    try {
      const labelKey = this.gameRegistry.getModeLabel(this.gameId, modeId);
      if (labelKey) {
        const translation = this.i18n.t(labelKey)();
        if (translation) return translation;
      }
    } catch (e) {
      console.error('Error getting mode label:', e);
    }
    if (typeof modeId === 'string') {
      if (modeId.includes(GameMode.Steal)) return this.i18n.t('game.steal_mode')() || 'PK Steal';
      if (modeId.includes(GameMode.Speed)) return this.i18n.t('game.speed_mode')() || 'PK Speed';
    }
    return modeId || '';
  }

  showCopiedToast = signal(false);
  linkCopied = signal(false);
  roomCopied = signal(false);

  getInviteUrl(): string {
    const url = new URL(getHref());
    url.searchParams.set('joinRoom', this.roomId);
    url.searchParams.set('mode', this.mode);
    url.searchParams.set('diff', this.difficulty);
    url.searchParams.set('host', this.hostId);
    return url.toString();
  }

  copyRoomId() {
    navigator.clipboard.writeText(this.roomId).then(() => {
      this.roomCopied.set(true);
      this.toast.show(this.i18n.t('game.copied_room_id')() || 'Room ID copied!', 'success');
      setTimeout(() => this.roomCopied.set(false), 2000);
    });
  }

  async shareInviteLink() {
    const url = this.getInviteUrl();
    const gameName = this.i18n.t('lobby.' + this.gameId)() || this.gameId;
    let text = this.i18n.t('share.room_invite')() || `I am waiting for you in [game]! Click the link to join my room [room] directly and let's play!`;
    text = text.replace('[game]', gameName).replace('[room]', this.roomId);

    const shareData = {
      title: `${gameName} - ${this.i18n.t('app.title')()}`,
      text: text,
      url: url,
      gameName: gameName
    };

    if (this.shareService.canNativeShare()) {
      // Direct native share sheet (must be called synchronously in gesture loop)
      const res = await this.shareService.share(shareData);
      if (res === 'native') {
        this.linkCopied.set(true);
        setTimeout(() => this.linkCopied.set(false), 2500);
      }
    } else {
      // Desktop / unsupported: copy link directly to clipboard with toast
      await this.shareService.copyUrl(url);
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2500);
    }
  }

  copyInviteLink() {
    return this.shareInviteLink();
  }

  openFriendList() {
    this.friendService.togglePanel(true, {
      gameId: this.gameId,
      difficulty: this.difficulty,
      mode: this.mode
    });
  }

  isFriend(username: string): boolean {
    if (username === this.currentUserId) return true;
    return this.friendService.friends().some(f => f.username === username);
  }

  addFriend(username: string) {
    if (this.currentUserId?.startsWith('guest_')) {
      this.toast.show(this.i18n.t('game.cannot_add_guest')() || 'Cannot add guest players', 'error');
      return;
    }
    this.friendService.sendRequestByUsername(username).subscribe({
      next: () => this.toast.show(this.i18n.t('game.friend_request_sent')() || 'Friend request sent!', 'success'),
      error: () => this.toast.show('Failed to send request', 'error')
    });
  }

  ngOnInit() {
    this.audioService.playBgm('/assets/music/waiter_pk.mp3');
    
    if (this.mode !== GameMode.Single) {
      QRCode.toDataURL(this.getInviteUrl(), {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(url => {
        this.qrCodeUrl.set(url);
      }).catch(err => console.error('Failed to generate QR code', err));
    }
  }

  ngOnDestroy() {
    this.audioService.stopBgm();
  }
}
