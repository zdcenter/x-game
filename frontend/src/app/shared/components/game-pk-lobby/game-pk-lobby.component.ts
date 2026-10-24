import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { C2SAction } from '../../../core/models/websocket.model';
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
import { EditRoomService } from '../../../core/services/edit-room.service';
import { FriendService } from '../../../core/services/friend.service';
import { CoinService } from '../../../core/services/coin.service';
import { CoinGuideService } from '../../../core/services/coin-guide.service';
import { CoinIconComponent } from '../coin-icon/coin-icon.component';
import { LiveActivityTickerComponent } from '../live-activity-ticker/live-activity-ticker.component';
import { LiveActivityService } from '../../../core/services/live-activity.service';
import confetti from 'canvas-confetti';

export interface PkCreateRoomEvent {
  name: string;
  gameId: string;
  mode: string;
  difficulty: string;
  password?: string;
  target: number;
  bountyCoins?: number;
}

export interface PkJoinRoomEvent {
  roomId: string;
  mode: string;
  difficulty: string;
  host: string;
  password?: string;
  bountyCoins?: number;
}

@Component({
  selector: 'app-game-pk-lobby',
  standalone: true,
  imports: [CommonModule, GameHeaderComponent, CoinIconComponent, LiveActivityTickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-pk-lobby.component.html',
  host: { class: 'flex flex-col flex-1 min-h-0 w-full' },
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
  private settings    = inject(SettingsService);
  private editRoomSvc = inject(EditRoomService);
  friendService       = inject(FriendService);
  readonly coinService = inject(CoinService);
  readonly coinGuideService = inject(CoinGuideService);
  private activityService = inject(LiveActivityService);

  isFriend(username: string): boolean {
    if (username === this.playerId()) return true;
    return this.friendService.friends().some(f => f.username === username);
  }

  addFriend(username: string) {
    if (this.playerId()?.startsWith('guest_')) {
      this.toast.show(this.t('game.cannot_add_guest') || 'Cannot add guest players', 'error');
      return;
    }
    this.friendService.sendRequestByUsername(username).subscribe({
      next: () => this.toast.show(this.t('game.friend_request_sent') || 'Friend request sent!', 'success'),
      error: () => this.toast.show('Failed to send request', 'error')
    });
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  @Input() gameId       : string = '';
  @Input() currentRoomId: string = '';
  @Input() isArena      : boolean = false;

  // ── Outputs ───────────────────────────────────────────────────────────────
  @Output() createRoom  = new EventEmitter<PkCreateRoomEvent>();
  @Output() joinRoom    = new EventEmitter<PkJoinRoomEvent>();
  @Output() back        = new EventEmitter<void>();

  // ── State ─────────────────────────────────────────────────────────────────
  playerId   = computed(() => this.auth.currentUser()?.username || this.auth.guestId);
  rightTab   = signal<'rooms' | 'online'>('rooms');
  formOpen   = signal(false); // mobile accordion only; desktop always shows form via CSS

  // Create form — step wizard
  createStep     = signal<'game' | 'settings'>('game'); // 步骤：选游戏 or 填设置
  createModalOpen = signal(false); // Quick Create Modal (Zero-scroll architecture)
  mobileStep     = signal<'game' | 'settings'>('game');
  createGameId   = signal('');
  roomName       = signal('');
  roomMode       = signal('');
  roomDifficulty = signal('');
  roomPassword   = signal('');
  roomTarget     = signal(1);
  roomBounty     = signal(0);
  readonly pkTargetOptions = [1, 3, 5, 10];
  readonly bountyOptions = [0, 50, 100, 200];

  readonly isBountyInsufficient = computed(() => {
    const bounty = this.roomBounty();
    return bounty > 0 && this.coinService.coins() < bounty;
  });

  readonly bountyShortage = computed(() => {
    const bounty = this.roomBounty();
    const current = this.coinService.coins();
    return bounty > current ? bounty - current : 0;
  });

  selectBounty(b: number) {
    this.roomBounty.set(b);
    if (b > 0 && this.coinService.coins() < b) {
      const shortage = b - this.coinService.coins();
      const msg = this.t('game.bounty_insufficient_inline')
        .replace('{current}', this.coinService.coins().toString())
        .replace('{needed}', shortage.toString())
        .replace('{cost}', b.toString());
      this.toast.show(msg, 'info');
    }
  }

  // Room list filter
  roomGameFilter = signal('');   // '' = all games

  // Password prompt for password-protected rooms
  pwPromptOpen   = signal(false);
  pwPromptRoomId = signal('');
  pwPromptGame   = signal('');
  pwPromptMode   = signal('');
  pwPromptDiff   = signal('');
  pwPromptHost   = signal('');
  pwInput        = signal('');


  // ── Computed ──────────────────────────────────────────────────────────────
  allGames        = computed(() => this.reg.getAllConfigs());
  selectedGameCfg = computed(() => this.allGames().find(g => g.id === this.createGameId()));

  readonly isMultiRoundEnabled = computed(() => {
    if (this.settings.settings().pk_multi_round_enabled === 'false') return false;
    return this.reg.getConfig(this.createGameId())?.multiRound === true;
  });

  availableModes = computed(() =>
    (this.reg.getConfig(this.createGameId())?.modes || []).filter(m => m.id !== GameMode.Single)
  );

  availableDifficulties = computed(() =>
    this.reg.getConfig(this.createGameId())?.difficulties || []
  );

  challengeInfo = computed(() => {
    const q = this.route.snapshot.queryParams;
    if (!q['challenge']) return null;
    return { challenger: q['challenge'] as string, score: (q['score'] as string) || '' };
  });

  allRooms   = computed(() => this.wsService.activeRooms().filter((r: any) => r.mode !== GameMode.Single));
  myRooms    = computed(() => this.allRooms().filter((r: any) => r.host === this.playerId()));
  otherRooms = computed(() => {
    const others = this.allRooms().filter((r: any) => r.host !== this.playerId());
    const filter = this.roomGameFilter();
    return filter ? others.filter((r: any) => r.game === filter) : others;
  });
  onlinePlayers = computed(() => this.wsService.onlinePlayers().filter((p: any) => p.id !== this.playerId()));

  // Unique game IDs appearing in other rooms (for filter chips)
  activeRoomGameIds = computed(() => {
    const ids = this.allRooms()
      .filter((r: any) => r.host !== this.playerId())
      .map((r: any) => r.game as string);
    return [...new Set(ids)];
  });

  // Current room (user is in it)
  currentRoom = computed(() =>
    this.currentRoomId ? this.allRooms().find((r: any) => r.id === this.currentRoomId) ?? null : null
  );

  // Stats ticker
  totalActiveRooms = computed(() => this.allRooms().length);
  totalOnline      = computed(() => this.wsService.onlinePlayers().length);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.initForm();
  }

  ngOnDestroy() {}

  // ── Form helpers ──────────────────────────────────────────────────────────
  private initForm() {
    const lastGame = typeof localStorage !== 'undefined' ? localStorage.getItem('pk_last_game_id') : null;
    const startGame = this.gameId || lastGame || '';
    if (startGame) {
      this.selectCreateGame(startGame);
      if (this.gameId) {
        // If it came explicitly from Input (URL), open the form on mobile
        this.formOpen.set(true);
      }
    } else {
      this.createGameId.set('');
    }
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.roomName.set(`${this.playerId()}-${suffix}`);
    this.roomPassword.set('');
    this.roomTarget.set(1);
    if (this.gameId) {
      this.openCreateModal(this.gameId);
    }
  }

  openCreateModal(gameId?: string) {
    if (gameId) {
      this.selectCreateGame(gameId);
      this.mobileStep.set('settings');
    } else {
      if (!this.createGameId()) {
        const defaultGame = this.allGames()[0]?.id || 'minesweeper';
        this.selectCreateGame(defaultGame);
      }
      this.mobileStep.set('game');
    }
    this.createModalOpen.set(true);
  }

  closeCreateModal() {
    this.createModalOpen.set(false);
  }

  selectCreateGame(id: string) {
    this.createGameId.set(id);
    if (!id) return; // 清空选择
    const modes = this.availableModes();
    this.roomMode.set(modes[0]?.id || '');
    const diffs = this.availableDifficulties();
    this.roomDifficulty.set(diffs[0]?.id || '');
  }

  pickGameAndNext(id: string) {
    this.selectCreateGame(id);
    this.mobileStep.set('settings');
  }

  // 同款创建
  createSameKind(room: any) {
    this.selectCreateGame(room.game);
    this.roomMode.set(room.mode);
    this.roomDifficulty.set(room.difficulty);
    this.openCreateModal(room.game);
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
    this.closeCreateModal();
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
    const bounty = this.roomBounty();
    if (bounty > 0 && this.coinService.coins() < bounty) {
      this.toast.show(this.t('game.bounty_insufficient') || '脑力币不足，无法创建该悬赏房间', 'error');
      return;
    }

    const gameId = this.createGameId() || this.gameId;
    const name = this.roomName().trim() || `${gameId}-${Date.now()}`;
    this.wsService.setPendingAction('create');
    const target = this.isMultiRoundEnabled() ? this.roomTarget() : 1;
    const pwd = this.roomPassword().trim();
    this.createRoom.emit({ name, gameId, mode, difficulty: diff, password: pwd || undefined, target, bountyCoins: bounty });
    // 方案B: 保存上次选择
    if (typeof localStorage !== 'undefined') localStorage.setItem('pk_last_game_id', gameId);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.roomName.set(`${this.playerId()}-${suffix}`);
    this.roomPassword.set('');
  }

  // ── Room list helpers ─────────────────────────────────────────────────────
  onJoinRoom(roomId: string, game: string, mode: string, difficulty: string, host: string, hasPassword?: boolean, bountyCoins?: number) {
    if (bountyCoins && bountyCoins > 0 && this.coinService.coins() < bountyCoins) {
      this.toast.show(this.t('game.bounty_insufficient') || '脑力币不足，无法加入该悬赏房间', 'error');
      return;
    }
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
    this.doJoin(roomId, game, mode, difficulty, host, undefined, bountyCoins);
  }

  onConfirmPassword() {
    const pw = this.pwInput();
    if (!pw) return;
    this.pwPromptOpen.set(false);
    this.doJoin(this.pwPromptRoomId(), this.pwPromptGame(), this.pwPromptMode(), this.pwPromptDiff(), this.pwPromptHost(), pw);
  }

  private doJoin(roomId: string, game: string, mode: string, difficulty: string, host: string, password?: string, bountyCoins?: number) {
    if (bountyCoins && bountyCoins > 0 && this.coinService.coins() < bountyCoins) {
      this.toast.show(this.t('game.bounty_insufficient') || '脑力币不足，无法加入该悬赏房间', 'error');
      return;
    }
    if (this.isArena || (game && game !== this.gameId)) {
      this.cross.setPendingJoin({ game, roomId, mode, difficulty, host, password, bountyCoins });
      const lang = this.router.url.split('/')[1] || 'zh';
      this.router.navigate([`/${lang}/games/${game}`]);
    } else {
      this.wsService.setPendingAction('join');
      this.joinRoom.emit({ roomId, mode, difficulty, host, password, bountyCoins });
    }
  }

  onDismissRoom(roomId: string) {
    const targetRoom = this.allRooms().find((r: any) => r.id === roomId);
    const playerCount = targetRoom?.player_count ?? targetRoom?.players?.length ?? 1;

    if (playerCount <= 1) {
      this.wsService.sendLobby({ type: 'dismiss_room', roomId });
      this.toast.show(this.t('game.dismiss_success'), 'success');
      return;
    }

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

  // ── Change-game overlay（通过 EditRoomService + AppComponent 全局覆盖层）──
  openChangeRoomModal(room: any) {
    this.editRoomSvc.open({
      roomId:      room.id,
      gameId:      room.game,
      mode:        room.mode,
      difficulty:  room.difficulty,
      target:      room.target ?? 1,
      bountyCoins: room.bountyCoins ?? 0,
    });
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
    if (!diffId) return '';
    let clean = diffId.trim();
    if (clean.startsWith('game.difficulty_')) clean = clean.replace('game.difficulty_', '');
    if (clean.startsWith('game.diff_')) clean = clean.replace('game.diff_', '');

    if (gameId) {
      const cfg = this.reg.getConfig(gameId);
      const diff = cfg?.difficulties.find(d => d.id === clean || d.id === diffId);
      if (diff) {
        const label = diff.labelKey ? this.t(diff.labelKey) : diff.id;
        const desc = diff.descKey ? this.t(diff.descKey) : diff.desc;
        const safeLabel = (label && label !== diff.labelKey) ? label : (diff.desc || clean);
        return desc && desc !== diff.descKey ? `${safeLabel} (${desc})` : safeLabel;
      }
    }
    const dKey = `game.diff_${clean}`;
    const dVal = this.t(dKey);
    if (dVal && dVal !== dKey) return dVal;

    switch (clean.toLowerCase()) {
      case 'easy':
      case 'beginner': return this.t('game.diff_easy') || '简单';
      case 'medium':
      case 'normal':
      case 'intermediate': return this.t('game.diff_medium') || '中等';
      case 'hard':
      case 'advanced': return this.t('game.diff_hard') || '困难';
      case 'expert': return this.t('game.diff_expert') || '专家';
      case 'master': return this.t('game.diff_master') || '大师';
      default:
        return clean.includes('.') ? (clean.split('.').pop() || clean) : clean;
    }
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

  onQuickMatch() {
    const gameId = this.createGameId() || this.gameId;
    const waiting = this.otherRooms().find((r: any) => r.game === gameId && r.status === GameStatus.Waiting);
    if (waiting) {
      this.onJoinRoom(waiting.id, waiting.game, waiting.mode, waiting.difficulty, waiting.host, waiting.hasPassword);
    } else {
      this.onConfirmCreate();
    }
  }

  getPlayerStatusText(player: any): string {
    const gameName = player.game ? this.gameLabel(player.game) : '';
    const diffName = player.diff ? this.diffLabel(player.diff, player.game) : '';
    if (player.status === 'pk') {
      const tpl = this.t('game.player_status_pk') || '正在与【{opponent}】激战 {game}';
      return tpl.replace('{opponent}', player.opponent || '对手').replace('{game}', gameName || 'PK');
    }
    if (player.status === 'playing') {
      const tpl = this.t('game.player_status_playing') || '正在挑战 {game} {diff}';
      return tpl.replace('{game}', gameName || '益智游戏').replace('{diff}', diffName ? `· ${diffName}` : '');
    }
    return this.t('game.player_status_idle') || '空闲中 · 随时可迎战';
  }

  invitePlayer(player: any) {
    const gameId = player.game || this.createGameId() || this.gameId || 'tetris';
    const roomName = `duel-${Date.now().toString(36).slice(-4)}`;
    this.cross.setPendingJoin({
      game: gameId,
      roomId: roomName,
      mode: 'pk_speed',
      difficulty: player.diff || 'medium',
      host: this.playerId(),
      action: 'create',
      inviteUsernames: [player.username]
    });
    const lang = this.router.url.split('/')[1] || 'zh';
    this.router.navigate([`/${lang}/games/${gameId}`]);
    this.toast.show(
      (this.t('activity.challenge_created') || '已创建对决房间，正在进入并邀请 {user}...').replace('{user}', player.username),
      'success'
    );
  }

  playSameGame(player: any) {
    if (!player.game) return;
    const lang = this.router.url.split('/')[1] || 'zh';
    this.router.navigate([`/${lang}/games/${player.game}`]);
  }

  spectatePlayer(player: any) {
    if (player.roomId) {
      this.onJoinRoom(player.roomId, player.game, player.mode || 'pk', player.diff || 'medium', player.username);
    } else if (player.game) {
      this.playSameGame(player);
    }
  }

  cheerPlayer(player: any) {
    this.activityService.sendCheer(player.username, player.game || 'lobby');
    confetti({ particleCount: 35, spread: 55, origin: { y: 0.7 } });
    const cheerSentTpl = this.t('activity.cheer_sent') || '🎉 已为玩家【{user}】送出喝彩！';
    this.toast.show(cheerSentTpl.replace('{user}', player.username), 'success');
  }
}
