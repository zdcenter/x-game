import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';

@Component({
  selector: 'app-game-waiting-room',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex-grow flex items-center justify-center p-4 sm:p-6 h-full w-full">
      <div class="bg-[var(--color-bg-card)] rounded-2xl sm:rounded-3xl shadow-2xl border border-[var(--color-border-card)] p-4 sm:p-8 max-w-2xl w-full max-h-full flex flex-col text-center relative overflow-hidden">
        <!-- Decorative bg -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent-from)] opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-[var(--color-accent-to)] opacity-5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        
        <div class="relative z-10 flex flex-col h-full overflow-hidden">
          <!-- Header (Title & Room Info) -->
          <div class="shrink-0">
            <h2 class="text-3xl sm:text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 uppercase tracking-tight">
              {{ i18n.t('lobby.' + gameId)() }} - <ng-container i18n="@@game.waiting_room">game.waiting_room</ng-container>
            </h2>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-8 text-sm sm:text-base">
              <p class="text-[var(--color-text-muted)] font-medium bg-[var(--color-bg-main)] border border-[var(--color-border-card)] px-4 py-2 rounded-xl shadow-sm"><ng-container i18n="@@game.mode">game.mode</ng-container>: <span class="text-[var(--color-accent-from)] font-bold ml-1">{{ getModeName(mode) }}</span></p>
              <div class="flex items-center gap-2">
                <p class="text-[var(--color-text-muted)] font-medium bg-[var(--color-bg-main)] border border-[var(--color-border-card)] px-4 py-2 rounded-xl shadow-sm"><ng-container i18n="@@game.room_name">game.room_name</ng-container>: <span class="font-mono text-[var(--color-accent-from)] font-bold ml-1">{{ roomId }}</span></p>
                @if (mode !== 'single') {
                  <button (click)="copyInviteLink()" class="relative group p-2 bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl hover:bg-[var(--color-accent-from)]/10 hover:border-[var(--color-accent-from)]/50 transition-all active:scale-95 text-[var(--color-text-muted)] hover:text-[var(--color-accent-from)]" [title]="i18n.t('game.copy_invite_link')() || 'Copy Invite Link'">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    @if (showCopiedToast()) {
                      <span class="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--color-accent-from)] text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap animate-fade-in-up">
                        <ng-container i18n="@@game.copied">Copied!</ng-container>
                      </span>
                    }
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Players List (Scrollable) -->
          <div class="flex-grow overflow-y-auto custom-scrollbar my-2 min-h-[100px] flex flex-wrap justify-center gap-4 sm:gap-6 py-2 px-2">
            @for (player of sortedPlayers; track player.id) {
              <div class="w-28 sm:w-40 flex flex-col items-center p-3 sm:p-6 bg-[var(--color-bg-main)] rounded-2xl border border-[var(--color-border-card)] shadow-inner relative group">
                <div class="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-[var(--color-bg-card)] border-2 border-[var(--color-border-card)] mb-2 sm:mb-3 flex items-center justify-center text-2xl sm:text-3xl shadow-lg group-hover:scale-105 transition-transform text-[var(--color-text-main)] relative shrink-0">
                  @if (player.id === hostId) { 👑 } @else { 👤 }
                  @if (readyPlayers[player.id]) {
                    <div class="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500 rounded-full border-2 border-[var(--color-bg-card)] shadow-md flex items-center justify-center text-white text-xs sm:text-base animate-bounce">
                      ✅
                    </div>
                  }
                </div>
                <span class="font-bold text-xs sm:text-base text-[var(--color-text-main)] truncate w-full text-center">{{ player.id }}</span>
                @if (player.id === hostId) {
                  <span class="absolute -top-3 bg-yellow-500 text-black text-[10px] font-black uppercase px-2 py-1 rounded-full shadow-md shadow-yellow-500/20"><ng-container i18n="@@game.host">game.host</ng-container></span>
                }
                
                @if (currentUserId === hostId && player.id !== hostId) {
                  <button (click)="kick.emit(player.id)" class="absolute top-1 right-1 sm:top-2 sm:right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 flex items-center justify-center transition-colors shadow-sm" title="Kick Player">
                    ✕
                  </button>
                }
              </div>
            }
          </div>

          <!-- Actions Footer -->
          <div class="shrink-0 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4 mt-auto">
            <button (click)="leave.emit()" class="px-8 py-3.5 rounded-xl border-2 border-[var(--color-border-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] font-bold transition-all active:scale-95 shadow-sm">
              <ng-container i18n="@@game.leave">game.leave</ng-container>
            </button>
            
            @if (currentUserId === hostId) {
              <button (click)="changeSettings.emit()" class="px-8 py-3.5 rounded-xl border-2 border-blue-500/50 text-blue-400 hover:text-white hover:bg-blue-600 font-bold transition-all active:scale-95 shadow-sm">
                <ng-container i18n="@@game.change_settings">Change Settings</ng-container>
              </button>
              <button (click)="start.emit()" [disabled]="!allGuestsReady" [class.opacity-50]="!allGuestsReady" [class.cursor-not-allowed]="!allGuestsReady" class="px-10 py-3.5 rounded-xl bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] font-black uppercase tracking-wider hover:opacity-90 shadow-lg transition-all active:scale-95 border border-transparent flex flex-col items-center justify-center">
                <span><ng-container i18n="@@game.start_match">game.start_match</ng-container></span>
                @if (!allGuestsReady) {
                  <span class="text-[10px] opacity-80 normal-case"><ng-container i18n="@@game.waiting_for_players_ready">Waiting for all players to ready...</ng-container></span>
                }
              </button>
            } @else {
              @if (isSpectator) {
                <button class="px-10 py-3.5 rounded-xl bg-[var(--color-bg-card)] text-[var(--color-text-muted)] font-black uppercase tracking-wider shadow-inner transition-all border border-[var(--color-border-card)] cursor-default">
                  <ng-container i18n="@@game.spectating">Spectating...</ng-container>
                </button>
              } @else if (readyPlayers[currentUserId]) {
                <button (click)="cancelReady.emit()" class="px-10 py-3.5 rounded-xl bg-amber-500 text-black font-black uppercase tracking-wider hover:bg-amber-400 shadow-lg transition-all active:scale-95 border border-transparent">
                  <ng-container i18n="@@game.cancel_ready">Cancel Ready</ng-container>
                </button>
              } @else {
                <button (click)="ready.emit()" class="px-10 py-3.5 rounded-xl bg-emerald-500 text-white font-black uppercase tracking-wider hover:bg-emerald-400 shadow-lg transition-all active:scale-95 border border-transparent animate-pulse">
                  <ng-container i18n="@@game.ready">Ready</ng-container>
                </button>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class GameWaitingRoomComponent {
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

  @Output() leave = new EventEmitter<void>();
  @Output() start = new EventEmitter<void>();
  @Output() changeSettings = new EventEmitter<void>();
  @Output() kick = new EventEmitter<string>();
  @Output() ready = new EventEmitter<void>();
  @Output() cancelReady = new EventEmitter<void>();

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
    if (guests.length === 0 && this.mode !== 'single') return false; // Must have at least 1 guest in PK
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
      if (modeId.includes('steal')) return this.i18n.t('game.steal_mode')() || 'PK Steal';
      if (modeId.includes('speed')) return this.i18n.t('game.speed_mode')() || 'PK Speed';
    }
    return modeId || '';
  }

  showCopiedToast = signal(false);

  copyInviteLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('joinRoom', this.roomId);
    url.searchParams.set('mode', this.mode);
    url.searchParams.set('diff', this.difficulty);
    url.searchParams.set('host', this.hostId);
    
    const gameName = this.i18n.t('lobby.' + this.gameId)() || this.gameId;
    let message = this.i18n.t('game.invite_message')() || `I am playing [game]! Join my room [room]:\n[url]`;
    message = message.replace('[game]', gameName).replace('[room]', this.roomId).replace('[url]', url.toString());
    
    const showSuccess = () => {
      this.showCopiedToast.set(true);
      setTimeout(() => this.showCopiedToast.set(false), 3000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(message).then(showSuccess).catch(err => {
        console.warn('Clipboard API failed, using fallback.', err);
        this.fallbackCopyTextToClipboard(message, showSuccess);
      });
    } else {
      this.fallbackCopyTextToClipboard(message, showSuccess);
    }
  }

  private fallbackCopyTextToClipboard(text: string, onSuccess: () => void) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        onSuccess();
      } else {
        alert('Failed to copy. Please manually copy the link: ' + text);
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      alert('Failed to copy. Please manually copy the link: ' + text);
    }
    document.body.removeChild(textArea);
  }
}
