import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import {
  Component, Input, Output, EventEmitter, inject, signal, computed,
  ChangeDetectionStrategy, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { ToastService } from '../../../core/services/toast.service';
import { SettingsService } from '../../../core/services/settings.service';
import { GameHeaderComponent } from '../game-header/game-header.component';

export interface PkCreateRoomEvent {
  name: string;
  gameId: string;
  mode: string;
  difficulty: string;
  password?: string;
  target: number;
}

export interface PkJoinRoomEvent {
  roomId: string;
  mode: string;
  difficulty: string;
  host: string;
  password?: string;
}

@Component({
  selector: 'app-game-pk-lobby',
  standalone: true,
  imports: [CommonModule, DatePipe, GameHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-pk-lobby.component.html',
})
export class GamePkLobbyComponent implements OnInit, OnDestroy {
  GameStatus = GameStatus;
  GameMode = GameMode;

  private i18n    = inject(I18nService);
  wsService       = inject(WebSocketService);
  private auth    = inject(AuthStore);
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);
  private cross   = inject(CrossGameJoinService);
  private reg     = inject(GameRegistryService);
  private toast   = inject(ToastService);
  private settings = inject(SettingsService);

  readonly isMultiRoundEnabled = computed(() => {
    if (this.settings.settings().pk_multi_round_enabled === 'false') return false;
    return this.reg.getConfig(this.gameId)?.multiRound === true;
  });

  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input() gameId       : string = '';
  @Input() currentRoomId: string = '';

  // ── Outputs ───────────────────────────────────────────────────────────────
  @Output() createRoom  = new EventEmitter<PkCreateRoomEvent>();
  @Output() joinRoom    = new EventEmitter<PkJoinRoomEvent>();
  @Output() back        = new EventEmitter<void>();

  // ── State ─────────────────────────────────────────────────────────────────
  playerId   = computed(() => this.auth.currentUser()?.username || this.auth.guestId);
  rightTab   = signal<'rooms' | 'online'>('rooms');
  formOpen   = signal(true);   // mobile accordion toggle

  // Create form fields
  roomName       = signal('');
  roomMode       = signal('');
  roomDifficulty = signal('');
  roomPassword   = signal('');
  roomTarget     = signal(1);
  readonly pkTargetOptions = [1, 3, 5, 10];

  // Password prompt for password-protected rooms
  pwPromptOpen   = signal(false);
  pwPromptRoomId = signal('');
  pwPromptGame   = signal('');
  pwPromptMode   = signal('');
  pwPromptDiff   = signal('');
  pwPromptHost   = signal('');
  pwInput        = signal('');

  // ── Computed ──────────────────────────────────────────────────────────────
  gameTitle = computed(() => {
    const cfg = this.reg.getConfig(this.gameId);
    return cfg?.titleKey ? this.t(cfg.titleKey) : this.gameId;
  });

  gameIconPath = computed(() => `/assets/games/icons/${this.gameId}.svg?v=2`);

  availableModes = computed(() =>
    (this.reg.getConfig(this.gameId)?.modes || []).filter(m => m.id !== GameMode.Single)
  );

  availableDifficulties = computed(() =>
    this.reg.getConfig(this.gameId)?.difficulties || []
  );

  challengeInfo = computed(() => {
    const q = this.route.snapshot.queryParams;
    if (!q['challenge']) return null;
    return { challenger: q['challenge'] as string, score: (q['score'] as string) || '' };
  });

  allRooms     = computed(() => this.wsService.activeRooms().filter((r: any) => r.mode !== GameMode.Single));
  myRooms      = computed(() => this.allRooms().filter((r: any) => r.host === this.playerId()));
  otherRooms   = computed(() => this.allRooms().filter((r: any) => r.host !== this.playerId()));
  onlinePlayers = computed(() => this.wsService.onlinePlayers().filter((p: any) => p.id !== this.playerId()));

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.initForm();
  }

  ngOnDestroy() {}

  // ── Form helpers ──────────────────────────────────────────────────────────
  private initForm() {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.roomName.set(`${this.playerId()}-${suffix}`);

    const modes = this.availableModes();
    if (modes.length > 0) this.roomMode.set(modes[0].id);

    const diffs = this.availableDifficulties();
    if (diffs.length > 0) this.roomDifficulty.set(diffs[0].id);

    this.roomPassword.set('');
    this.roomTarget.set(1);
  }

  updateInput(sig: ReturnType<typeof signal<string>>, event: Event, maxLen = 100, numbersOnly = false) {
    const el = event.target as HTMLInputElement;
    let v = el.value;
    if (numbersOnly) v = v.replace(/[^0-9]/g, '').slice(0, maxLen);
    else v = v.slice(0, maxLen);
    el.value = v;
    sig.set(v);
  }

  onConfirmCreate() {
    let mode = this.roomMode();
    if (!mode) {
      const m = this.availableModes();
      if (m.length) mode = m[0].id;
    }
    let diff = this.roomDifficulty();
    if (!diff) {
      const d = this.availableDifficulties();
      if (d.length) diff = d[0].id;
    }
    const name = this.roomName().trim() || `${this.gameId}-${Date.now()}`;
    this.wsService.setPendingAction('create');
    const target = this.isMultiRoundEnabled() ? this.roomTarget() : 1;
    this.createRoom.emit({ name, gameId: this.gameId, mode, difficulty: diff, password: this.roomPassword() || undefined, target });
    // Re-randomise name for next time
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.roomName.set(`${this.playerId()}-${suffix}`);
    this.roomPassword.set('');
  }

  // ── Room list helpers ─────────────────────────────────────────────────────
  onJoinRoom(roomId: string, game: string, mode: string, difficulty: string, host: string, hasPassword?: boolean) {
    if (hasPassword) {
      this.pwPromptRoomId.set(roomId);
      this.pwPromptGame.set(game);
      this.pwPromptMode.set(mode);
      this.pwPromptDiff.set(difficulty);
      this.pwPromptHost.set(host);
      this.pwInput.set('');
      this.pwPromptOpen.set(true);
      return;
    }
    this.doJoin(roomId, game, mode, difficulty, host);
  }

  onConfirmPassword() {
    const pw = this.pwInput();
    if (!pw) return;
    this.pwPromptOpen.set(false);
    this.doJoin(this.pwPromptRoomId(), this.pwPromptGame(), this.pwPromptMode(), this.pwPromptDiff(), this.pwPromptHost(), pw);
  }

  private doJoin(roomId: string, game: string, mode: string, difficulty: string, host: string, password?: string) {
    if (game && game !== this.gameId) {
      this.cross.setPendingJoin({ game, roomId, mode, difficulty, host, password });
      this.router.navigate(['/games/' + game]);
    } else {
      this.wsService.setPendingAction('join');
      this.joinRoom.emit({ roomId, mode, difficulty, host, password });
    }
  }

  onDismissRoom(roomId: string) {
    this.toast.confirm({
      title: this.t('game.dismiss_title'),
      message: this.t('game.dismiss_msg'),
      confirmText: this.t('game.dismiss_confirm'),
      cancelText: this.t('game.cancel'),
      onConfirm: () => {
        this.wsService.sendLobby({ type: 'dismiss_room', roomId });
        this.toast.show(this.t('game.dismiss_success'), 'success');
      }
    });
  }

  sendHeroBroadcast(room: any) {
    this.wsService.sendLobby({ type: 'broadcast', room: { id: room.id, game: room.game, mode: room.mode, difficulty: room.difficulty, host: room.host } });
    this.toast.show(this.t('game.broadcast_success'), 'success');
  }

  // ── Label helpers ─────────────────────────────────────────────────────────
  t(key: string): string { return this.i18n.t(key)(); }

  gameLabel(gameId: string): string {
    const cfg = this.reg.getConfig(gameId);
    return cfg?.titleKey ? this.t(cfg.titleKey) : gameId;
  }

  modeLabel(modeId: string, gameId?: string): string {
    if (gameId) {
      const k = this.reg.getModeLabel(gameId, modeId);
      if (k) return this.t(k);
    }
    if (modeId.includes(GameMode.Steal)) return this.t('game.steal_mode');
    if (modeId.includes(GameMode.Speed)) return this.t('game.speed_mode');
    return modeId;
  }

  diffLabel(diffId: string, gameId?: string): string {
    if (gameId) {
      const k = this.reg.getDifficultyLabel(gameId, diffId);
      if (k) return this.t(k);
    }
    if (diffId === GameDifficulty.Easy)   return this.t('game.diff_easy');
    if (diffId === GameDifficulty.Medium) return this.t('game.diff_medium');
    if (diffId === GameDifficulty.Hard)   return this.t('game.diff_hard');
    return diffId;
  }

  decodeName(name: string, max = 14): string {
    let s = name;
    try { s = decodeURIComponent(name); } catch { /* ignore */ }
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  formatHost(name: string, max = 12): string {
    if (!name) return '';
    return name.length > max ? name.slice(0, max) + '…' : name;
  }
}
