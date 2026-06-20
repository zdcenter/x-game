import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, Input, Output, EventEmitter, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { ToastService } from '../../../core/services/toast.service';

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
  imports: [CommonModule],
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

  private route = inject(ActivatedRoute);
  private crossGameJoin = inject(CrossGameJoinService);
  private gameRegistry = inject(GameRegistryService);
  private toastService = inject(ToastService);

  @Input() currentGameId: string = '';
  @Input() currentRoomId: string = '';
  @Input() isGlobal: boolean = false;

  @Output() joinRoom = new EventEmitter<{ roomId: string; mode: string; difficulty: string; host: string; password?: string }>();
  @Output() createRoom = new EventEmitter<{ name: string; gameId: string; mode: string; difficulty: string; password?: string; target: number }>();

  activeTab: 'rooms' | 'online' = 'rooms';

  playerId = computed(() => this.authStore.currentUser()?.username || this.authStore.guestId);

  challengeInfo = computed(() => {
    const q = this.route.snapshot.queryParams;
    if (!q['challenge']) return null;
    return { challenger: q['challenge'] as string, score: (q['score'] as string) || '' };
  });

  isCreateModalOpen = signal(false);
  isUpdateMode = signal(false);
  updatingRoomId = signal('');
  newRoomGameId = signal('');
  newRoomMode = signal('');
  newRoomDifficulty = signal('');

  isPasswordPromptOpen = signal(false);
  passwordPromptRoomId = signal('');
  passwordPromptGame = signal('');
  passwordPromptMode = signal('');
  passwordPromptDifficulty = signal('');
  passwordPromptHost = signal('');
  passwordInput = signal('');

  allGames = computed(() => this.gameRegistry.getAllConfigs());

  availableModes = computed(() => {
    const modes = this.gameRegistry.getConfig(this.newRoomGameId())?.modes || [];
    return modes.filter(m => m.id !== GameMode.Single);
  });

  availableDifficulties = computed(() =>
    this.gameRegistry.getConfig(this.newRoomGameId())?.difficulties || []
  );

  gameRooms = computed(() =>
    this.wsService.activeRooms().filter((r: any) => r.mode !== GameMode.Single)
  );

  myRooms = computed(() => this.gameRooms().filter((r: any) => r.host === this.playerId()));
  otherRooms = computed(() => this.gameRooms().filter((r: any) => r.host !== this.playerId()));
  otherOnlinePlayers = computed(() =>
    this.wsService.onlinePlayers().filter((p: any) => p.id !== this.playerId())
  );

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
    this.isUpdateMode.set(true);
    this.updatingRoomId.set(room.id);
    this.selectGameForNewRoom(room.game);
    this.newRoomMode.set(room.mode);
    this.newRoomDifficulty.set(room.difficulty);
    this.isCreateModalOpen.set(true);
  }

  selectGameForNewRoom(gameId: string) {
    this.newRoomGameId.set(gameId);
    const modes = this.availableModes();
    this.newRoomMode.set(modes.length > 0 ? modes[0].id : '');
    const diffs = this.availableDifficulties();
    this.newRoomDifficulty.set(diffs.length > 0 ? diffs[0].id : '');
  }

  updatePasswordInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/[^0-9]/g, '').slice(0, 4);
    input.value = val;
    this.passwordInput.set(val);
  }

  onConfirmCreateRoom() {
    this.wsService.send({
      type: 'change_game',
      roomId: this.updatingRoomId(),
      game: this.newRoomGameId(),
      mode: this.newRoomMode(),
      difficulty: this.newRoomDifficulty(),
    });
    this.isCreateModalOpen.set(false);
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

  getModeLabel(modeId: string, gameId?: string): string {
    if (gameId) {
      const labelKey = this.gameRegistry.getModeLabel(gameId, modeId);
      if (labelKey) return this.t(labelKey);
    }
    if (modeId.includes(GameMode.Steal)) return this.t('game.steal_mode');
    if (modeId.includes(GameMode.Speed)) return this.t('game.speed_mode');
    return modeId;
  }

  getGameLabel(gameId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    return config?.titleKey ? this.t(config.titleKey) : this.t('app.title');
  }

  getDifficultyLabel(diffId: string, gameId?: string): string {
    if (gameId) {
      const labelKey = this.gameRegistry.getDifficultyLabel(gameId, diffId);
      if (labelKey) return this.t(labelKey);
    }
    if (diffId === GameDifficulty.Easy) return this.t('game.diff_easy');
    if (diffId === GameDifficulty.Medium) return this.t('game.diff_medium');
    if (diffId === GameDifficulty.Hard) return this.t('game.diff_hard');
    return diffId;
  }
}
