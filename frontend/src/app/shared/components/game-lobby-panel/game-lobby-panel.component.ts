import { Component, Input, Output, EventEmitter, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { CrossGameJoinService } from '../../../core/services/cross-game-join.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { getLocalizedField } from '../../../core/services/game.service';
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
  template: `
    <div class="w-full h-full flex flex-col bg-[var(--color-bg-card)] backdrop-blur-xl border border-[var(--color-border-card)] rounded-2xl lg:rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.1)]">
      <!-- Tabs -->
      <div class="flex border-b border-[var(--color-border-card)]">
        <button (click)="activeTab = 'rooms'" [class.bg-[var(--color-bg-main)]]="activeTab === 'rooms'" [class.text-[var(--color-accent-from)]]="activeTab === 'rooms'" [class.opacity-50]="activeTab !== 'rooms'" class="flex-1 py-4 font-bold text-sm hover:opacity-100 transition-all uppercase tracking-widest">
          {{ t('game.arena_rooms') }}
        </button>
        <button (click)="activeTab = 'online'" [class.bg-[var(--color-bg-main)]]="activeTab === 'online'" [class.text-[var(--color-accent-from)]]="activeTab === 'online'" [class.opacity-50]="activeTab !== 'online'" class="flex-1 py-4 font-bold text-sm hover:opacity-100 transition-all uppercase tracking-widest relative">
          {{ t('game.online') }}
          <span class="absolute top-2 right-4 bg-[var(--color-accent-to)] text-[var(--color-bg-main)] text-[10px] font-black px-1.5 py-0.5 rounded-full">{{ wsService.onlinePlayers().length }}</span>
        </button>
      </div>

      <!-- Rooms Content -->
      @if (activeTab === 'rooms') {
        <div class="p-4 flex-grow overflow-y-auto custom-scrollbar relative flex flex-col">
          <!-- Broadcast Messages Banner -->
          @if (wsService.broadcastMessages().length > 0) {
            <div class="w-full flex flex-col gap-2 mb-4 shrink-0">
              @for (msg of wsService.broadcastMessages(); track msg.timestamp) {
                <div class="w-full bg-gradient-to-r from-yellow-500/10 via-amber-500/20 to-orange-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-slide-in">
                  <div class="flex items-center gap-3 overflow-hidden">
                    <span class="text-2xl animate-pulse shrink-0">📢</span>
                    <div class="text-sm font-bold text-[var(--color-text-main)] truncate">
                      👑 玩家【<span class="text-yellow-500">{{ msg.senderName || msg.senderId }}</span>】在《{{ getGameLabel(msg.room.game) }}》{{ getModeLabel(msg.room.mode, msg.room.game) }}摆下擂台，
                      <button (click)="onJoinRoom(msg.room.id, msg.room.game, msg.room.mode, msg.room.difficulty, msg.room.host)" class="text-amber-400 hover:text-amber-300 underline decoration-amber-400/50 hover:decoration-amber-300 font-black cursor-pointer ml-1 transition-colors">
                        [点击此处] 立即应战！
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <div class="shrink-0">
            <button (click)="openCreateRoomModal()" class="w-full mb-4 py-3 rounded-xl font-bold border border-[var(--color-accent-from)] text-[var(--color-accent-from)] hover:bg-[var(--color-accent-from)] hover:text-[var(--color-bg-main)] transition-colors flex justify-center items-center gap-2">
              <span>➕</span> {{ t('game.create_pk') }}
            </button>
          </div>

          <div class="space-y-6 flex-grow">
            <!-- Other Active Rooms -->
            <div>
              <div class="flex items-center justify-between mb-3 px-1">
                <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ t('game.active_rooms') }} ({{ otherRooms().length }})</h3>
              </div>
              <div class="space-y-3">
                @for (room of otherRooms(); track room.id) {
                  <div class="p-3 bg-[var(--color-bg-main)] rounded-xl border border-[var(--color-border-card)] hover:border-[var(--color-accent-to)] transition-colors">
                    <div class="flex justify-between items-center mb-2">
                      <div class="flex items-center gap-2">
                        <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-[var(--color-border-card)] bg-[var(--color-bg-main)] shadow-sm shrink-0 flex items-center gap-1"
                              [class.text-blue-400]="room.game === 'sudoku'"
                              [class.text-green-400]="room.game === 'minesweeper'"
                              [class.text-purple-400]="room.game === 'hexa'"
                              [class.text-orange-400]="room.game === 'sliding'"
                              [class.text-indigo-400]="room.game === 'tetris'"
                              [class.text-emerald-400]="room.game === 'codebreaker'"
                              [class.text-amber-400]="room.game === 'gomoku'">
                          <span>{{ getGameIconEmoji(room.game) }}</span>
                          <span>{{ getGameLabel(room.game) }}</span>
                        </span>
                        <span class="font-mono text-sm font-bold text-[var(--color-text-main)] truncate max-w-[120px] sm:max-w-[180px]" [title]="decodeName(room.id, 100)">{{ decodeName(room.id) }}</span>
                      </div>
                      <span class="text-xs font-bold uppercase px-2 py-0.5 rounded"
                            [class.bg-yellow-500]="room.status === 'playing'" [class.text-black]="room.status === 'playing'"
                            [class.bg-[var(--color-accent-to)]]="room.status === 'waiting'" [class.text-[var(--color-bg-main)]]="room.status === 'waiting'">
                        {{ room.status }}
                      </span>
                    </div>
                    <div class="flex justify-between items-end">
                      <div class="text-[10px] opacity-70 uppercase tracking-wider flex items-center gap-2">
                        <span>{{ t('game.host') }}: <span class="text-[var(--color-accent-from)] font-bold" [title]="room.host">{{ formatHost(room.host) }}</span></span>
                        @if (room.createdAt) {
                          <span class="w-1 h-1 rounded-full bg-[var(--color-border-card)]"></span>
                          <span>{{ room.createdAt * 1000 | date:'HH:mm:ss' }}</span>
                        }
                        <span class="w-1 h-1 rounded-full bg-[var(--color-border-card)]"></span>
                        <span>{{ t('game.mode') }}: <span class="text-inherit">{{ getModeLabel(room.mode, room.game) }}</span></span>
                        <span class="w-1 h-1 rounded-full bg-[var(--color-border-card)]"></span>
                        <span>{{ t('game.diff') }}: <span class="text-yellow-500">{{ getDifficultyLabel(room.difficulty, room.game) }}</span></span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-400">{{ room.players }} {{ t('game.players_count') }}</span>
                        @if (currentRoomId === room.id) {
                          <button disabled class="px-3 py-1 bg-[var(--color-bg-card)] opacity-50 text-[var(--color-accent-from)] border border-[var(--color-accent-from)]/30 text-xs font-bold rounded shadow cursor-not-allowed">{{ t('game.joined') }}</button>
                        } @else if (room.status === 'waiting') {
                          <button (click)="onJoinRoom(room.id, room.game, room.mode, room.difficulty, room.host)" class="px-3 py-1 bg-[var(--color-accent-from)] text-[var(--color-bg-main)] text-xs font-bold rounded shadow hover:opacity-80 transition-opacity">{{ t('game.join') }}</button>
                        } @else {
                          <button disabled class="px-3 py-1 bg-[var(--color-bg-card)] opacity-50 text-inherit text-xs font-bold rounded shadow cursor-not-allowed">{{ t('game.started') }}</button>
                        }
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-700 rounded-xl">
                    {{ t('game.no_rooms') }}<br>{{ t('game.create_one') }}
                  </div>
                }
              </div>
            </div>

            <!-- My Rooms -->
            @if (myRooms().length > 0) {
              <div>
                <div class="flex items-center justify-between mb-3 px-1">
                  <h3 class="text-xs font-black text-[var(--color-accent-to)] uppercase tracking-widest">{{ t('game.my_room') }}</h3>
                </div>
                <div class="space-y-3">
                  @for (room of myRooms(); track room.id) {
                    <div class="p-3 bg-[var(--color-bg-card)] rounded-xl border-[2px] border-[var(--color-accent-to)] shadow-sm">
                      <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center gap-2">
                          <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-[var(--color-border-card)] bg-[var(--color-bg-main)] shadow-sm shrink-0 flex items-center gap-1"
                                [class.text-blue-400]="room.game === 'sudoku'"
                                [class.text-green-400]="room.game === 'minesweeper'"
                                [class.text-purple-400]="room.game === 'hexa'"
                                [class.text-orange-400]="room.game === 'sliding'"
                                [class.text-indigo-400]="room.game === 'tetris'"
                                [class.text-emerald-400]="room.game === 'codebreaker'"
                                [class.text-amber-400]="room.game === 'gomoku'">
                            <span>{{ getGameIconEmoji(room.game) }}</span>
                            <span>{{ getGameLabel(room.game) }}</span>
                          </span>
                          <span class="font-mono text-sm font-bold text-inherit truncate max-w-[100px] sm:max-w-[150px]" [title]="decodeName(room.id, 100)">{{ decodeName(room.id) }} ({{ t('game.host') }})</span>
                        </div>
                        <span class="text-xs font-bold uppercase px-2 py-0.5 rounded"
                              [class.bg-yellow-500]="room.status === 'playing'" [class.text-black]="room.status === 'playing'"
                              [class.bg-[var(--color-accent-to)]]="room.status === 'waiting'" [class.text-[var(--color-bg-main)]]="room.status === 'waiting'">
                          {{ room.status }}
                        </span>
                      </div>
                      <div class="flex justify-between items-end">
                        <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider flex flex-col gap-1">
                          <div>{{ t('game.mode') }}: <span class="text-[var(--color-text-main)]">{{ getModeLabel(room.mode, room.game) }}</span></div>
                          <div>{{ t('game.diff') }}: <span class="text-amber-500 font-bold">{{ getDifficultyLabel(room.difficulty, room.game) }}</span></div>
                          @if (room.createdAt) {
                            <div class="opacity-80">{{ t('game.created_at') }}: {{ room.createdAt * 1000 | date:'HH:mm:ss' }}</div>
                          }
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-slate-400">{{ room.players }} {{ t('game.players_count') }}</span>
                          @if (currentRoomId === room.id) {
                            <button disabled class="px-3 py-1 bg-[var(--color-bg-card)] opacity-50 text-[var(--color-accent-from)] border border-[var(--color-accent-from)]/30 text-xs font-bold rounded shadow cursor-not-allowed ml-2">{{ t('game.joined') }}</button>
                          } @else {
                            <button (click)="onJoinRoom(room.id, room.game, room.mode, room.difficulty, room.host)" class="px-3 py-1 bg-[var(--color-accent-from)] text-[var(--color-bg-main)] text-xs font-bold rounded shadow hover:opacity-80 transition-opacity ml-2">{{ t('game.join') }}</button>
                          }
                          @if (room.host === playerId()) {
                            <button (click)="sendHeroBroadcast(room)" class="px-3 py-1 bg-amber-600/20 text-amber-400 border border-amber-500/50 text-xs font-bold rounded shadow hover:bg-amber-600 hover:text-white transition-colors ml-2">
                              📢 发英雄帖
                            </button>
                            <button (click)="openUpdateRoomModal(room)" class="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/50 text-xs font-bold rounded shadow hover:bg-blue-600 hover:text-white transition-colors ml-2">
                              {{ t('game.change_settings') || 'Change Game' }}
                            </button>
                            <button (click)="onDismissRoom(room.id)" class="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/50 text-xs font-bold rounded shadow hover:bg-red-600 hover:text-white transition-colors ml-2">{{ t('game.dismiss_room') }}</button>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Online Content -->
      @if (activeTab === 'online') {
        <div class="p-4 flex-grow overflow-y-auto space-y-2 custom-scrollbar">
          @for (player of otherOnlinePlayers(); track player.id) {
            <div class="flex items-center justify-between p-3 bg-[var(--color-bg-main)] rounded-xl border border-[var(--color-border-card)]">
              <div class="flex items-center gap-3">
                <div class="relative">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                    {{ player.username?.charAt(0)?.toUpperCase() }}
                  </div>
                  <div class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-800"
                       [class.bg-[var(--color-accent-to)]]="player.status === 'idle'"
                       [class.bg-yellow-400]="player.status === 'playing'"></div>
                </div>
                <div>
                  <div class="text-sm font-bold text-inherit leading-none truncate max-w-[120px]" [title]="player.username">{{ formatHost(player.username, 15) }}</div>
                  <div class="text-[10px] opacity-70 uppercase mt-1">{{ player.status }}</div>
                </div>
              </div>
              <button [disabled]="player.status !== 'idle'" class="text-xs font-bold text-[var(--color-accent-from)] px-2 py-1 hover:bg-[var(--color-accent-from)]/20 rounded disabled:opacity-30 transition-colors">
                INVITE
              </button>
            </div>
          }
        </div>
      }
    </div>

    <!-- Create Room Modal Overlay -->
    @if (isCreateModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center px-4 pb-4 pt-0 bg-[var(--color-overlay)] backdrop-blur-sm transition-opacity overflow-y-auto">
        <div class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-t-none rounded-b-2xl md:rounded-b-3xl p-5 md:p-8 w-full max-w-md shadow-2xl transform transition-all text-[var(--color-text-main)] h-fit max-h-[95vh] md:max-h-[90vh] flex flex-col">
          <div class="flex justify-between items-center mb-4 md:mb-6 shrink-0">
            <h2 class="text-xl md:text-2xl font-bold">
              {{ isUpdateMode() ? (t('game.update_settings') || 'Update Room') : t('game.create_room_title') }}
              @if (!isGlobal && !isUpdateMode()) {
                - {{ t('lobby.' + currentGameId) }}
              }
            </h2>
            <button (click)="isCreateModalOpen.set(false)" class="text-xl opacity-50 hover:opacity-100 transition-opacity">
              ✕
            </button>
          </div>
          
          <div class="space-y-5 md:space-y-6 overflow-y-auto overflow-x-hidden flex-1 pr-1 custom-scrollbar">
            <!-- Room Name -->
            @if (!isUpdateMode()) {
              <div>
                <label class="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">{{ t('game.room_name') }}</label>
                <input type="text" [value]="newRoomName()" (input)="updateRoomName($event)"
                       class="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-inherit focus:outline-none focus:border-[var(--color-accent-to)] transition-colors"
                       placeholder="Enter room name">
              </div>
            }
                        <!-- Game Selection (Global Mode Only or Update Mode) -->
            @if (isGlobal || isUpdateMode()) {
              <div>
                <label class="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">{{ t('game.select_game') }}</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (game of allGames(); track game.id) {
                    <button (click)="selectGameForNewRoom(game.id)"
                            [class.bg-[var(--color-accent-to)]]="newRoomGameId() === game.id" [class.text-[var(--color-bg-main)]]="newRoomGameId() === game.id" [class.border-[var(--color-accent-to)]]="newRoomGameId() === game.id"
                            [class.bg-[var(--color-bg-card)]]="newRoomGameId() !== game.id" [class.hover:border-[var(--color-accent-to)]]="newRoomGameId() !== game.id"
                            class="px-2 pt-3 pb-2 rounded-xl border border-[var(--color-border-card)] font-bold text-xs transition-all flex flex-col items-center justify-start text-center gap-1 min-h-[72px]">
                      <span class="text-lg">{{ game.iconEmoji }}</span>
                      <span class="leading-tight">{{ t(game.titleKey) }}</span>
                    </button>
                  }
                </div>
              </div>
            }

            <!-- PK Mode -->
            @if (availableModes().length > 0) {
              <div>
                <label class="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">{{ t('game.game_mode') }}</label>
                <div class="grid grid-cols-2 gap-3">
                  @for (mode of availableModes(); track mode.id) {
                    <button (click)="newRoomMode.set(mode.id)" 
                            [class.bg-[var(--color-accent-to)]]="newRoomMode() === mode.id" [class.text-[var(--color-bg-main)]]="newRoomMode() === mode.id" [class.border-[var(--color-accent-to)]]="newRoomMode() === mode.id"
                            [class.bg-[var(--color-bg-card)]]="newRoomMode() !== mode.id" [class.hover:border-[var(--color-accent-to)]]="newRoomMode() !== mode.id"
                            class="px-4 py-3 rounded-xl border border-[var(--color-border-card)] font-bold text-sm transition-all text-left">
                      <div class="flex items-center gap-2 mb-1">
                        <span>{{ mode.icon }}</span> <span>{{ t(mode.labelKey) }}</span>
                      </div>
                      @if (mode.desc || mode.descKey) {
                        <div class="text-[10px] font-normal opacity-80 leading-tight">{{ mode.descKey ? t(mode.descKey) : mode.desc }}</div>
                      }
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Difficulty -->
            @if (availableDifficulties().length > 0) {
              <div>
              <label class="block text-xs font-bold opacity-70 uppercase tracking-wider mb-2">{{ t('game.diff') }}</label>
              <div class="grid grid-cols-3 gap-2">
                @for (diff of availableDifficulties(); track diff.id) {
                  <button (click)="newRoomDifficulty.set(diff.id)"
                          [class.bg-[var(--color-accent-from)]]="newRoomDifficulty() === diff.id" [class.text-[var(--color-bg-main)]]="newRoomDifficulty() === diff.id" [class.border-[var(--color-accent-from)]]="newRoomDifficulty() === diff.id"
                          [class.bg-[var(--color-bg-card)]]="newRoomDifficulty() !== diff.id" [class.hover:border-[var(--color-accent-from)]]="newRoomDifficulty() !== diff.id"
                          class="px-2 md:px-3 pt-3 pb-2 rounded-lg border border-[var(--color-border-card)] font-bold text-xs transition-all flex flex-col items-center justify-start text-center gap-1 min-h-[72px]">
                    <span>{{ t(diff.labelKey) }}</span>
                    <span class="text-[9px] font-normal opacity-80 leading-tight">{{ diff.descKey ? t(diff.descKey) : diff.desc }}</span>
                  </button>
                }
              </div>
              </div>
            }

            <!-- Action Buttons -->
            <div class="pt-2 pb-2 flex gap-3 shrink-0">
              <button (click)="isCreateModalOpen.set(false)" class="flex-1 py-3 rounded-xl font-bold bg-[var(--color-bg-card)] hover:bg-[var(--color-border-card)] border border-[var(--color-border-card)] transition-colors">
                {{ t('game.cancel') }}
              </button>
              <button (click)="onConfirmCreateRoom()" class="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] shadow-lg hover:shadow-xl transition-all hover:brightness-110 active:scale-95">
                {{ isUpdateMode() ? (t('game.update') || 'Update') : t('game.create_and_join') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class GameLobbyPanelComponent {
  i18n = inject(I18nService);
  wsService = inject(WebSocketService);
  authStore = inject(AuthStore);
  private router = inject(Router);
  private crossGameJoin = inject(CrossGameJoinService);
  private gameRegistry = inject(GameRegistryService);
  private toastService = inject(ToastService);

  @Input() currentGameId: string = '';
  @Input() currentRoomId: string = '';
  @Input() isGlobal: boolean = false;

  @Output() joinRoom = new EventEmitter<{roomId: string, mode: string, difficulty: string, host: string}>();
  @Output() createRoom = new EventEmitter<{name: string, gameId: string, mode: string, difficulty: string}>();

  activeTab: 'rooms' | 'online' = 'rooms';
  playerId = computed(() => this.authStore.currentUser()?.username || this.authStore.guestId);

  isCreateModalOpen = signal(false);
  isUpdateMode = signal(false);
  updatingRoomId = signal('');
  newRoomName = signal('');
  newRoomGameId = signal('');
  newRoomMode = signal('');
  newRoomDifficulty = signal('');

  allGames = computed(() => this.gameRegistry.getAllConfigs());
  availableModes = computed(() => this.gameRegistry.getConfig(this.newRoomGameId())?.modes || []);
  availableDifficulties = computed(() => this.gameRegistry.getConfig(this.newRoomGameId())?.difficulties || []);
  
  // Show all active rooms across all games
  gameRooms = computed(() => this.wsService.activeRooms());
  
  myRooms = computed(() => this.gameRooms().filter((r: any) => r.host === this.playerId()));
  otherRooms = computed(() => this.gameRooms().filter((r: any) => r.host !== this.playerId()));
  otherOnlinePlayers = computed(() => this.wsService.onlinePlayers().filter((p: any) => p.id !== this.playerId()));

  t(key: string): string {
    return this.i18n.t(key)();
  }

  decodeName(name: string, maxLength = 12): string {
    let decoded = name;
    try {
      decoded = decodeURIComponent(name);
    } catch {
      decoded = name;
    }
    if (decoded.length > maxLength) {
      return decoded.substring(0, maxLength) + '...';
    }
    return decoded;
  }

  formatHost(name: string, maxLength = 10): string {
    if (!name) return '';
    if (name.length > maxLength) {
      return name.substring(0, maxLength) + '...';
    }
    return name;
  }

  openCreateRoomModal() {
    this.isUpdateMode.set(false);
    this.updatingRoomId.set('');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.newRoomName.set(`${this.playerId()}-${randomSuffix}`);
    const initialGame = this.isGlobal ? (this.allGames()[0]?.id || '') : this.currentGameId;
    this.selectGameForNewRoom(initialGame);
    this.isCreateModalOpen.set(true);
  }

  openUpdateRoomModal(room: any) {
    this.isUpdateMode.set(true);
    this.updatingRoomId.set(room.id);
    this.newRoomName.set(room.id); // not editable anyway
    this.selectGameForNewRoom(room.game);
    this.newRoomMode.set(room.mode);
    this.newRoomDifficulty.set(room.difficulty);
    this.isCreateModalOpen.set(true);
  }

  selectGameForNewRoom(gameId: string) {
    this.newRoomGameId.set(gameId);
    const config = this.gameRegistry.getConfig(gameId);
    if (config) {
      this.newRoomMode.set(config.modes[0]?.id || '');
      this.newRoomDifficulty.set(config.difficulties[0]?.id || '');
    } else {
      this.newRoomMode.set('');
      this.newRoomDifficulty.set('');
    }
  }

  updateRoomName(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newRoomName.set(input.value);
  }

  onConfirmCreateRoom() {
    if (this.isUpdateMode()) {
      this.wsService.send({
        type: 'change_game',
        roomId: this.updatingRoomId(),
        game: this.newRoomGameId(),
        mode: this.newRoomMode(),
        difficulty: this.newRoomDifficulty()
      });
      this.isCreateModalOpen.set(false);
      return;
    }

    const roomName = this.newRoomName().trim() || `${this.newRoomGameId()}-${Date.now()}`;
    this.createRoom.emit({
      name: roomName,
      gameId: this.newRoomGameId(),
      mode: this.newRoomMode(),
      difficulty: this.newRoomDifficulty()
    });
    this.isCreateModalOpen.set(false);
  }

  onJoinRoom(roomId: string, game: string, mode: string, difficulty: string, host: string) {
    if (game && game !== this.currentGameId) {
      // Different game: store pending join info, then navigate with clean URL
      this.crossGameJoin.setPendingJoin({ game, roomId, mode, difficulty, host });
      this.router.navigate(['/games/' + game]);
    } else {
      // Same game, emit normal event
      this.joinRoom.emit({ roomId, mode, difficulty, host });
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
      }
    });
  }

  sendHeroBroadcast(room: any) {
    this.wsService.sendLobby({
      type: 'broadcast',
      room: {
        id: room.id,
        game: room.game,
        mode: room.mode,
        difficulty: room.difficulty,
        host: room.host
      }
    });
    this.toastService.show('广播发送成功！', 'success');
  }

  getModeLabel(modeId: string, gameId?: string): string {
    // Try registry lookup for cross-game rooms
    if (gameId) {
      const labelKey = this.gameRegistry.getModeLabel(gameId, modeId);
      if (labelKey) return this.t(labelKey);
    }
    // Global fallback
    if (modeId.includes('steal')) return this.t('game.steal_mode');
    if (modeId.includes('speed')) return this.t('game.speed_mode');
    return modeId;
  }

  getGameLabel(gameId: string): string {
    const config = this.gameRegistry.getConfig(gameId);
    if (config && config.titleKey) return this.t(config.titleKey);
    return this.t('app.title'); // fallback
  }

  getDifficultyLabel(diffId: string, gameId?: string): string {
    // Try registry lookup for cross-game rooms
    if (gameId) {
      const labelKey = this.gameRegistry.getDifficultyLabel(gameId, diffId);
      if (labelKey) return this.t(labelKey);
    }
    // Global fallback
    if (diffId === 'easy') return this.t('game.diff_easy');
    if (diffId === 'medium') return this.t('game.diff_medium');
    if (diffId === 'hard') return this.t('game.diff_hard');
    return diffId;
  }

  getGameIconEmoji(gameId: string): string {
    switch (gameId) {
      case 'minesweeper': return '💣';
      case 'sudoku': return '🔢';
      case 'sliding': return '🔲';
      case 'hexa': return '🔶';
      case 'tetris': return '🧱';
      case 'gomoku': return '⚫';
      case 'codebreaker': return '🔐';
      default: return '🎮';
    }
  }
}
