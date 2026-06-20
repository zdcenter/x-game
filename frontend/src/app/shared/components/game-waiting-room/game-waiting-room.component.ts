import { GameDifficulty, GameMode, GameStatus } from '../../../core/models/game.model';
import { Component, Input, Output, EventEmitter, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';
import { ShareService } from '../../../core/services/share.service';
import { getHref } from '../../../core/utils/browser.util';

@Component({
  selector: 'app-game-waiting-room',
  standalone: true,
  imports: [CommonModule],
  host: {
    'class': 'flex w-full h-full min-h-0'
  },
  template: `
    <div class="flex-grow flex items-stretch sm:items-center justify-center p-2 sm:p-4 h-full w-full min-h-0">
      <div class="bg-[var(--color-bg-card)] rounded-2xl sm:rounded-3xl shadow-2xl border border-[var(--color-border-card)] w-full max-w-lg sm:max-h-full flex flex-col relative overflow-hidden min-h-0">

        <!-- Decorative bg glows -->
        <div class="absolute top-0 right-0 w-56 h-56 bg-[var(--color-accent-from)] opacity-[0.06] rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-56 h-56 bg-[var(--color-accent-to)] opacity-[0.06] rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col h-full overflow-hidden min-h-0">

          <!-- ── Header ── -->
          <div class="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
            <!-- Game icon + title row -->
            <div class="flex items-center gap-3 mb-3">
              <div class="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] flex items-center justify-center shadow-inner shrink-0">
                <img [src]="'/assets/games/icons/' + gameId + '.svg?v=2'" class="w-7 h-7 sm:w-9 sm:h-9 object-contain" alt="">
              </div>
              <div class="min-w-0">
                <h2 class="text-base sm:text-xl font-black text-[var(--color-text-main)] leading-tight truncate">
                  {{ i18n.t('lobby.' + gameId)() }}
                </h2>
                <p class="text-[11px] sm:text-xs text-[var(--color-text-muted)] mt-0.5">{{ i18n.t('game.waiting_room')() }}</p>
              </div>
              <!-- Mode + Difficulty chips -->
              <div class="ml-auto flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <span class="text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg bg-[var(--color-accent-from)]/15 border border-[var(--color-accent-from)]/25 text-[var(--color-accent-from)]">
                  {{ getModeName(mode) }}
                </span>
                @if (difficulty) {
                  <span class="text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400">
                    {{ difficulty }}
                  </span>
                }
              </div>
            </div>

            <!-- Room ID strip + PK rule -->
            <div class="flex items-center gap-2">
              <div class="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)]">
                <span class="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-wider shrink-0">ID</span>
                <span class="font-mono text-xs text-[var(--color-text-main)] truncate flex-1">{{ roomId }}</span>
              </div>
              @if (mode !== GameMode.Single && target() > 0) {
                <div class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 shrink-0">
                  <span class="text-sm">🏆</span>
                  <span class="text-[10px] sm:text-xs font-bold text-yellow-400">×{{ target() }}</span>
                </div>
              }
            </div>
          </div>

          <!-- ── Invite Card (PK only) ── -->
          @if (mode !== GameMode.Single) {
            <div class="shrink-0 px-4 sm:px-6 pb-3">
              <div class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[var(--color-accent-from)]/10 to-[var(--color-accent-to)]/10 border border-[var(--color-accent-from)]/20">
                <div class="flex-1 min-w-0">
                  <p class="text-[10px] font-black text-[var(--color-accent-from)] uppercase tracking-widest mb-0.5">{{ i18n.t('share.invite_pk')() }}</p>
                  <p class="text-xs text-[var(--color-text-muted)] truncate font-mono">{{ roomId }}</p>
                </div>
                <button (click)="copyInviteLink()"
                  class="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] font-black text-xs transition-all active:scale-95 shadow-md hover:brightness-110">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {{ i18n.t('game.copy_invite_link')() || 'Invite' }}
                </button>
              </div>
            </div>
          }

          <!-- ── Divider ── -->
          <div class="shrink-0 px-4 sm:px-6">
            <div class="flex items-center gap-3 mb-3">
              <div class="h-px flex-1 bg-[var(--color-border-card)]"></div>
              <span class="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                {{ i18n.t('game.players')() || '玩家' }} {{ sortedPlayers.length }}
              </span>
              <div class="h-px flex-1 bg-[var(--color-border-card)]"></div>
            </div>
          </div>

          <!-- ── Players List ── -->
          <div class="flex-grow overflow-y-auto custom-scrollbar px-4 sm:px-6 pb-3 min-h-[120px]">
            <div class="flex flex-wrap justify-center gap-3 sm:gap-4">
              @for (player of sortedPlayers; track player.id) {
                <div class="relative flex flex-col items-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300 w-[calc(50%-6px)] sm:w-36"
                     [class.border-emerald-500]="readyPlayers[player.id]"
                     [class.bg-emerald-500/5]="readyPlayers[player.id]"
                     [class.shadow-[0_0_20px_rgba(16,185,129,0.18)]]="readyPlayers[player.id]"
                     [class.border-[var(--color-border-card)]]="!readyPlayers[player.id]"
                     [class.bg-[var(--color-bg-main)]]="!readyPlayers[player.id]">

                  <!-- Host badge -->
                  @if (player.id === hostId) {
                    <span class="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                      {{ i18n.t('game.host')() }}
                    </span>
                  }

                  <!-- Kick button (host only, for guests) -->
                  @if (currentUserId === hostId && player.id !== hostId) {
                    <button (click)="kick.emit(player.id)"
                            class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 flex items-center justify-center transition-colors text-[10px] font-bold">
                      ✕
                    </button>
                  }

                  <!-- Avatar -->
                  <div class="relative mt-1 mb-2 sm:mb-3">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg transition-transform"
                         [class.scale-105]="readyPlayers[player.id]"
                         [style.background]="player.id === hostId
                           ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                           : 'linear-gradient(135deg, #6366f1, #8b5cf6)'">
                      {{ player.id?.charAt(0)?.toUpperCase() }}
                    </div>
                    <!-- Ready checkmark overlay -->
                    @if (readyPlayers[player.id]) {
                      <div class="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 rounded-full border-2 border-[var(--color-bg-card)] shadow-md flex items-center justify-center text-white text-xs font-black">
                        ✓
                      </div>
                    } @else if (player.id !== hostId) {
                      <!-- Waiting pulse dot -->
                      <div class="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-amber-500/20 rounded-full border-2 border-[var(--color-bg-card)] flex items-center justify-center">
                        <div class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                      </div>
                    }
                  </div>

                  <!-- Player name -->
                  <span class="font-bold text-xs sm:text-sm text-[var(--color-text-main)] truncate w-full text-center">{{ player.id }}</span>

                  <!-- Status label -->
                  <span class="mt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider"
                        [class.text-emerald-400]="readyPlayers[player.id]"
                        [class.text-amber-400]="!readyPlayers[player.id] && player.id !== hostId"
                        [class.text-[var(--color-text-muted)]]="player.id === hostId">
                    @if (readyPlayers[player.id]) { {{ i18n.t('game.ready')() }} }
                    @else if (player.id === hostId) { {{ i18n.t('game.host')() }} }
                    @else { {{ i18n.t('game.waiting_challenger')() || '等待中...' }} }
                  </span>
                </div>
              }

              <!-- Empty slot placeholder (PK games with 1 player) -->
              @if (mode !== GameMode.Single && sortedPlayers.length < 2) {
                <div class="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 border-dashed border-[var(--color-border-card)] bg-[var(--color-bg-main)]/50 w-[calc(50%-6px)] sm:w-36 min-h-[140px]">
                  <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--color-bg-card)] border-2 border-dashed border-[var(--color-border-card)] flex items-center justify-center text-[var(--color-text-muted)] text-2xl mb-2">
                    ?
                  </div>
                  <span class="text-[10px] text-[var(--color-text-muted)] font-medium text-center">{{ i18n.t('game.waiting_challenger')() || '等待加入...' }}</span>
                </div>
              }
            </div>
          </div>

          <!-- ── Actions Footer ── -->
          <div class="shrink-0 px-4 sm:px-6 pt-2 pb-4 sm:pb-5">
            <!-- Host action row -->
            @if (currentUserId === hostId) {
              <div class="flex gap-2 mb-2">
                <button (click)="leave.emit()"
                        class="px-4 py-2.5 rounded-xl border border-[var(--color-border-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] font-bold text-sm transition-all active:scale-95">
                  {{ i18n.t('game.leave')() }}
                </button>
                <button (click)="changeSettings.emit()"
                        class="px-4 py-2.5 rounded-xl border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 font-bold text-sm transition-all active:scale-95">
                  ⚙️ {{ i18n.t('game.change_settings')() || 'Settings' }}
                </button>
                <button (click)="start.emit()"
                        [disabled]="!allGuestsReady"
                        class="flex-1 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-0.5"
                        [class.bg-gradient-to-r]="allGuestsReady"
                        [class.from-[var(--color-accent-from)]]="allGuestsReady"
                        [class.to-[var(--color-accent-to)]]="allGuestsReady"
                        [class.text-[var(--color-bg-main)]]="allGuestsReady"
                        [class.shadow-lg]="allGuestsReady"
                        [class.hover:brightness-110]="allGuestsReady"
                        [class.bg-[var(--color-bg-main)]]="!allGuestsReady"
                        [class.border]="!allGuestsReady"
                        [class.border-[var(--color-border-card)]]="!allGuestsReady"
                        [class.text-[var(--color-text-muted)]]="!allGuestsReady"
                        [class.cursor-not-allowed]="!allGuestsReady">
                  <span>{{ i18n.t('game.start_match')() }}</span>
                  @if (!allGuestsReady) {
                    <span class="text-[9px] font-normal normal-case opacity-70">{{ i18n.t('game.waiting_for_players_ready')() || '等待玩家准备...' }}</span>
                  }
                </button>
              </div>
            } @else {
              <!-- Guest action row -->
              <div class="flex gap-2">
                <button (click)="leave.emit()"
                        class="px-4 py-3 rounded-xl border border-[var(--color-border-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] font-bold text-sm transition-all active:scale-95">
                  {{ i18n.t('game.leave')() }}
                </button>
                @if (isSpectator) {
                  <button class="flex-1 py-3 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-muted)] font-black text-sm uppercase tracking-wide cursor-default">
                    {{ i18n.t('game.spectating')() || '旁观中...' }}
                  </button>
                } @else if (readyPlayers[currentUserId]) {
                  <button (click)="cancelReady.emit()"
                          class="flex-1 py-3 rounded-xl bg-amber-500 text-black font-black text-sm uppercase tracking-wide hover:bg-amber-400 shadow-lg transition-all active:scale-[0.98]">
                    {{ i18n.t('game.cancel_ready')() || '取消准备' }}
                  </button>
                } @else {
                  <button (click)="ready.emit()"
                          class="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm uppercase tracking-wide hover:brightness-110 shadow-lg transition-all active:scale-[0.98] animate-pulse">
                    {{ i18n.t('game.ready')() || '准备' }}
                  </button>
                }
              </div>
            }
          </div>

        </div>
      </div>
    </div>
  `
})
export class GameWaitingRoomComponent {
  GameMode = GameMode;
  i18n = inject(I18nService);
  gameRegistry = inject(GameRegistryService);

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

  shareService = inject(ShareService);

  get sortedPlayers() {
    if (!this.players) return [];
    return [...this.players].sort((a, b) => {
      if (a.id === this.hostId) return -1;
      if (b.id === this.hostId) return 1;
      return 0;
    });
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

  copyInviteLink() {
    const url = new URL(getHref());
    url.searchParams.set('joinRoom', this.roomId);
    url.searchParams.set('mode', this.mode);
    url.searchParams.set('diff', this.difficulty);
    url.searchParams.set('host', this.hostId);
    
    const gameName = this.i18n.t('lobby.' + this.gameId)() || this.gameId;
    let text = this.i18n.t('share.room_invite')() || `I am waiting for you in [game]! Click the link to join my room [room] directly and let's play!`;
    text = text.replace('[game]', gameName).replace('[room]', this.roomId);
    
    this.shareService.share({
      title: `${gameName} - Puzzle PK`,
      text: text,
      url: url.toString()
    });
  }
}
