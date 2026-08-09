import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, Input, Output, EventEmitter, inject, signal, computed, ChangeDetectionStrategy, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { ToastService } from '../../../core/services/toast.service';
import { EditRoomService } from '../../../core/services/edit-room.service';
import { AdService } from '../../../core/services/ad.service';
import { AdsenseComponent } from '../adsense/adsense.component';
import { AudioService } from '../../../core/services/audio.service';
import { FriendService } from '../../../core/services/friend.service';

export interface GameMode {
  id: string;
  labelKey: string;
  descKey?: string;
  desc?: string;
  icon: string;
}

export interface GameDifficulty {
  id: string;
  labelKey: string;
  descKey?: string;
  desc: string;
}

@Component({
  selector: 'app-game-lobby-panel',
  standalone: true,
  imports: [CommonModule, AdsenseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-lobby-panel.component.html',
})
export class GameLobbyPanelComponent implements OnInit {
  GameDifficulty = GameDifficulty;
  GameStatus = GameStatus;
  GameMode = GameMode;

  i18n = inject(I18nService);
  wsService = inject(WebSocketService);
  authStore = inject(AuthStore);
  router = inject(Router);
  adService = inject(AdService);
  audioService = inject(AudioService);

  private route = inject(ActivatedRoute);
  private gameRegistry = inject(GameRegistryService);
  private toastService = inject(ToastService);
  private editRoomService = inject(EditRoomService);
  private friendService = inject(FriendService);
  private crossGameJoin = inject(CrossGameJoinService);

  @Input() currentGameId: string = '';
  @Input() currentRoomId: string = '';
  @Input() isGlobal: boolean = false;

  @Output() joinRoom = new EventEmitter<{ roomId: string; mode: string; difficulty: string; host: string; password?: string }>();
  @Output() createRoom = new EventEmitter<{ name: string; gameId: string; mode: string; difficulty: string; password?: string; target: number }>();

  activeTab: 'rooms' | 'online' = 'rooms';
  isMatching = signal(false);
  matchingGameId = signal<string | null>(null);

  playerId = computed(() => this.authStore.currentUser()?.username || this.authStore.guestId);

  challengeInfo = computed(() => {
    const q = this.route.snapshot.queryParams;
    if (!q['challenge']) return null;
    return { challenger: q['challenge'] as string, score: (q['score'] as string) || '' };
  });

  isPasswordPromptOpen = signal(false);
  passwordPromptRoomId = signal('');
  passwordPromptGame = signal('');
  passwordPromptMode = signal('');
  passwordPromptDifficulty = signal('');
  passwordPromptHost = signal('');
  passwordInput = signal('');

  quickPhrases = computed(() => [
    this.t('game.quick_phrase_1') || '有人来切磋一下吗？',
    this.t('game.quick_phrase_2') || '我建好房间了，速度进！',
    this.t('game.quick_phrase_3') || '等一个高手。',
    this.t('game.quick_phrase_4') || '菜鸟互啄，欢乐多！',
    this.t('game.quick_phrase_5') || '谁敢来挑战我？'
  ]);
  isQuickPhraseDropdownOpen = signal(false);

  gameRooms = computed(() =>
    this.wsService.activeRooms().filter((r: any) => r.mode !== GameMode.Single)
  );

  myRooms = computed(() => this.gameRooms().filter((r: any) => r.host === this.playerId()));
  otherRooms = computed(() => this.gameRooms().filter((r: any) => r.host !== this.playerId()));
  otherOnlinePlayers = computed(() =>
    this.wsService.onlinePlayers().filter((p: any) => p.id !== this.playerId())
  );

  constructor() {
    effect(() => {
      if (this.wsService.matchSuccessEvent() > 0) {
        this.isMatching.set(false);
        this.matchingGameId.set(null);
      }
    });
  }

  ngOnInit() {}

  t(key: string): string {
    return this.i18n.t(key)();
  }

  decodeName(name: string, maxLength = 12): string {
    let decoded = name;
    try { decoded = decodeURIComponent(name); } catch { decoded = name; }
    return decoded.length > maxLength ? decoded.substring(0, maxLength) + '...' : decoded;
  }

  formatHost(name: string, maxLength = 10): string {
    if (!name) return '';
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  }

  openUpdateRoomModal(room: any) {
    this.editRoomService.open({
      roomId:     room.id,
      gameId:     room.game || this.currentGameId,
      mode:       room.mode || '',
      difficulty: room.difficulty || '',
      target:     room.target ?? 1,
    });
  }

  updatePasswordInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/[^0-9]/g, '').slice(0, 4);
    input.value = val;
    this.passwordInput.set(val);
  }

  isFriend(username: string): boolean {
    return this.friendService.friends().some(f => f.username === username);
  }

  addFriend(username: string) {
    if (username.startsWith('Guest_')) {
      this.toastService.show(this.t('game.cannot_add_guest') || 'Cannot add guest players', 'error');
      return;
    }
    this.friendService.sendRequestByUsername(username).subscribe({
      next: () => this.toastService.show(this.t('game.friend_request_sent') || 'Friend request sent!', 'success'),
      error: (err) => {
        const msg = err.error?.error || 'Failed to send request';
        this.toastService.show(msg, 'error');
      }
    });
  }

  invitePlayer(username: string) {
    const myRooms = this.myRooms();
    if (myRooms.length > 0) {
      this.friendService.sendInvite(username, myRooms[0].id);
      this.toastService.show(this.t('game.invite_sent') || 'Invite sent!', 'success');
    } else if (this.currentRoomId) {
      this.friendService.sendInvite(username, this.currentRoomId);
      this.toastService.show(this.t('game.invite_sent') || 'Invite sent!', 'success');
    } else {
      // Not in a room. Check if we are currently on a game page.
      const urlPath = this.router.url.split('?')[0];
      const segments = urlPath.split('/');
      const gamesIdx = segments.indexOf('games');
      const gameId = gamesIdx >= 0 ? segments[gamesIdx + 1] : null;

      if (gameId) {
        // Automatically create a private room and invite the player
        const randomPassword = Math.floor(1000 + Math.random() * 9000).toString();
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const myId = this.authStore.currentUser()?.username || this.authStore.guestId;
        const generatedRoomId = `${myId}-${suffix}`;

        let targetMode = 'multi';
        let targetDiff = 'medium';
        const config = this.gameRegistry.getConfig(gameId);
        if (config) {
          const mpMode = config.modes.find(m => m.id !== 'single');
          targetMode = mpMode ? mpMode.id : config.modes[0].id;
          targetDiff = config.difficulties.length > 0 ? config.difficulties[0].id : 'medium';
        }

        this.crossGameJoin.setPendingJoin({
          game: gameId,
          roomId: generatedRoomId,
          mode: targetMode,
          difficulty: targetDiff,
          host: '',
          password: randomPassword,
          action: 'create',
          inviteUsernames: [username]
        });
        
        // Force the game component to re-initialize and consume the pending join
        const lang = segments[1] || 'zh';
        const targetUrl = `/${lang}/games/${gameId}`;
        this.router.navigateByUrl(`/${lang}`, { skipLocationChange: true }).then(() => {
          this.router.navigate([targetUrl]);
        });
      } else {
        this.toastService.show(this.t('game.create_room_first') || 'Create or join a room first!', 'error');
      }
    }
  }

  onJoinRoom(roomId: string, game: string, mode: string, difficulty: string, host: string, hasPassword?: boolean) {
    if (hasPassword) {
      this.passwordPromptRoomId.set(roomId);
      this.passwordPromptGame.set(game);
      this.passwordPromptMode.set(mode);
      this.passwordPromptDifficulty.set(difficulty);
      this.passwordPromptHost.set(host);
      this.passwordInput.set('');
      this.isPasswordPromptOpen.set(true);
      return;
    }
    this.doJoinRoom(roomId, game, mode, difficulty, host);
  }

  onConfirmPassword() {
    const password = this.passwordInput();
    if (!password) return;
    this.isPasswordPromptOpen.set(false);
    this.doJoinRoom(
      this.passwordPromptRoomId(), this.passwordPromptGame(),
      this.passwordPromptMode(), this.passwordPromptDifficulty(),
      this.passwordPromptHost(), password
    );
  }

  private doJoinRoom(roomId: string, game: string, mode: string, difficulty: string, host: string, password?: string) {
    if (game && game !== this.currentGameId) {
      this.crossGameJoin.setPendingJoin({ game, roomId, mode, difficulty, host, password });
      this.router.navigate(['/games/' + game]);
    } else {
      this.wsService.setPendingAction('join');
      this.joinRoom.emit({ roomId, mode, difficulty, host, password });
    }
  }

  toggleQuickMatch() {
    if (this.isMatching()) {
      this.isMatching.set(false);
      this.matchingGameId.set(null);
      this.wsService.sendLobby({ type: 'cancel_match' });
    } else {
      if (!this.currentGameId) {
        this.toastService.show(this.t('game.quick_match_no_game') || '先在下方选择一款游戏', 'info');
        return;
      }
      
      this.isMatching.set(true);
      this.matchingGameId.set(this.currentGameId);
      // Determine what to match for.
      const config = this.gameRegistry.getConfig(this.currentGameId);
      const pkMode = config?.modes.find(m => m.id !== GameMode.Single)?.id || GameMode.Score;
      const difficulty = config?.difficulties[0]?.id || GameDifficulty.Medium;
      
      this.wsService.sendLobby({
        type: 'match',
        gameId: this.currentGameId,
        mode: pkMode,
        difficulty: difficulty,
        target: 1
      });
      this.audioService.playClick();
      
      // Auto cancel after 60s
      setTimeout(() => {
        if (this.isMatching()) {
          this.isMatching.set(false);
          this.matchingGameId.set(null);
          this.wsService.sendLobby({ type: 'cancel_match' });
          this.toastService.show(this.t('game.match_timeout') || '匹配超时，请稍后再试', 'info');
        }
      }, 60000);
    }
  }

  onDismissRoom(roomId: string) {
    this.toastService.confirm({
      title: this.t('game.dismiss_title'),
      message: this.t('game.dismiss_msg'),
      confirmText: this.t('game.dismiss_confirm'),
      cancelText: this.t('game.cancel'),
      onConfirm: () => {
        this.wsService.sendLobby({ type: 'dismiss_room', roomId });
        this.toastService.show(this.t('game.dismiss_success'), 'success');
      },
    });
  }

  sendHeroBroadcast(room: any) {
    this.wsService.sendLobby({
      type: 'broadcast',
      room: { id: room.id, game: room.game, mode: room.mode, difficulty: room.difficulty, host: room.host },
    });
    this.toastService.show(this.t('game.broadcast_success'), 'success');
  }

  sendQuickPhrase(phrase: string) {
    let room = null;
    const myFirstRoom = this.myRooms()[0];
    if (myFirstRoom) {
      room = { id: myFirstRoom.id, game: myFirstRoom.game, mode: myFirstRoom.mode, difficulty: myFirstRoom.difficulty, host: myFirstRoom.host };
    }
    
    this.wsService.sendLobby({
      type: 'broadcast',
      payload: { text: phrase },
      room: room
    });
    this.isQuickPhraseDropdownOpen.set(false);
    this.toastService.show(this.t('game.broadcast_success') || 'Sent successfully', 'success');
    this.audioService.playClick();
  }

  getModeLabel(modeId: string, gameId?: string): string {
    if (gameId) {
      const labelKey = this.gameRegistry.getModeLabel(gameId, modeId);
      if (labelKey) return this.t(labelKey);
    }
    if (modeId.includes(GameMode.Steal)) return this.t('game.steal_mode');
    if (modeId.includes(GameMode.Speed)) return this.t('game.speed_mode');
    return modeId;
  }

  getMatchingGameTitle(): string {
    const id = this.matchingGameId();
    if (!id) return '';
    return this.t(`lobby.${id}`) || id;
  }

  getGameLabel(gameId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    return config?.titleKey ? this.t(config.titleKey) : this.t('app.title');
  }

  getDifficultyLabel(diffId: string, gameId?: string): string {
    if (gameId) {
      const cfg = this.gameRegistry.getConfig(gameId);
      const diff = cfg?.difficulties.find(d => d.id === diffId);
      if (diff) {
        const label = diff.labelKey ? this.t(diff.labelKey) : diff.id;
        const desc = diff.descKey ? this.t(diff.descKey) : diff.desc;
        return desc ? `${label} (${desc})` : label;
      }
    }
    if (diffId === GameDifficulty.Easy) return this.t('game.diff_easy');
    if (diffId === GameDifficulty.Medium) return this.t('game.diff_medium');
    if (diffId === GameDifficulty.Hard) return this.t('game.diff_hard');
    return diffId;
  }
}
