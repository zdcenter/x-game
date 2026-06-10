import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AudioService } from '../../../core/services/audio.service';
import { Router } from '@angular/router';
import { GameRegistryService, GameConfig } from '../../../core/services/game-registry.service';
import { AdService } from '../../../core/services/ad.service';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-game-result-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute inset-0 z-[100] flex flex-col items-center backdrop-blur-md transition-colors duration-500 p-4 bg-[var(--color-overlay)] overflow-y-auto">
      <div class="m-auto w-full flex flex-col items-center">
        <!-- Result Card -->
        <div class="relative w-full max-w-md bg-[var(--color-bg-main)] border border-[var(--color-border-card)] shadow-2xl rounded-3xl p-8 md:p-10 flex flex-col items-center animate-scale-in overflow-hidden my-4 shrink-0">
           
        <!-- Title -->
        <h2 class="text-5xl md:text-6xl font-black mb-2 relative z-10 text-center"
            [ngClass]="{
              'text-amber-500 drop-shadow-md': status === 'win',
              'text-red-500 drop-shadow-md': status === 'lose'
            }">
          {{ title }}
        </h2>
        
        <p class="text-[var(--color-text-muted)] text-sm md:text-base mb-8 relative z-10 font-medium">
          {{ subtitle }}
        </p>

        <!-- Stats Grid -->
        @if (stats && stats.length > 0) {
          <div class="w-full flex justify-center gap-4 mb-10 relative z-10 flex-wrap">
            @for (stat of stats; track stat.label) {
              <div class="bg-[var(--color-bg-card)] backdrop-blur-md px-5 py-3 rounded-2xl border border-[var(--color-border-card)] text-center flex-1 min-w-[100px] shadow-sm">
                <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold mb-1">{{ stat.label }}</div>
                <div class="text-2xl font-black text-[var(--color-text-main)] font-mono">{{ stat.value }}</div>
              </div>
            }
          </div>
        }

        <!-- Guest Prompt -->
        @if (!authStore.isAuthenticated()) {
          <div class="w-full mb-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-inner relative z-10">
            <div class="text-2xl mb-1">💡</div>
            <p class="text-sm text-blue-400 mb-1 font-bold">{{ t('game.guest_prompt_title') || 'Save Your Progress' }}</p>
            <p class="text-xs text-[var(--color-text-muted)] mb-3 leading-relaxed">{{ t('game.guest_prompt_desc') || 'Register for free to save your progress and sync data across devices.' }}</p>
            <button (click)="goToLogin()" class="px-5 py-2 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/50 text-xs font-bold rounded-xl transition-all shadow-sm">
              {{ t('nav.login_register') || 'Login / Register' }}
            </button>
          </div>
        }

        <!-- Actions -->
        <div class="w-full flex flex-col sm:flex-row gap-3 relative z-10">
          @if (showLeave) {
            <button (click)="handleLeave()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-card)] hover:bg-[var(--color-border-card)] transition-colors">
              <ng-container i18n="@@game.leave">Leave</ng-container>
            </button>
          }
          
          @if (showRestart) {
            <button (click)="handleRestart()" 
              [ngClass]="{
                'bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white shadow-lg hover:shadow-xl': !showNextLevel,
                'bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-card)] hover:bg-[var(--color-border-card)]': showNextLevel
              }"
              class="flex-1 px-4 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all">
              <ng-container i18n="@@game.restart">Play Again</ng-container>
            </button>
          }

          @if (showNextLevel) {
            <button (click)="handleNextLevel()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-[var(--color-bg-main)] shadow-lg hover:shadow-xl transform sm:hover:scale-105 transition-all">
              <ng-container i18n="@@game.next_level">game.next_level</ng-container>
            </button>
          }
        </div>
        
        <div class="w-full flex gap-3 mt-3 relative z-10">
            @if (showDismiss) {
              <button (click)="handleDismiss()" class="flex-1 px-4 py-3 rounded-xl font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-colors">
                <ng-container i18n="@@game.dismiss_room">Dismiss Room</ng-container>
              </button>
            }
        </div>
      </div>

      <!-- Smart Recommendations -->
      @if (recommendedGames.length > 0) {
        <div class="w-full max-w-md mt-2 flex flex-col items-center animate-fade-in shrink-0 pb-8">
          <div class="text-[10px] text-white/70 uppercase tracking-widest font-bold mb-3 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
            <ng-container i18n="@@game.recommendations">You might also like</ng-container>
          </div>
          <div class="flex gap-3 w-full overflow-x-auto pb-4 px-2 custom-scrollbar snap-x justify-center">
            @for (game of recommendedGames; track game.id) {
              <div (click)="handleGoToGame(game.id)" class="shrink-0 w-[140px] bg-[var(--color-bg-card)] border border-[var(--color-border-card)] hover:border-[var(--color-accent-to)] rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-105 hover:shadow-xl hover:-translate-y-1 snap-center group">
                <img [src]="'/assets/games/icons/' + game.id + '.svg'" class="w-10 h-10 object-contain drop-shadow-md group-hover:scale-110 transition-transform" alt="icon">
                <div class="font-bold text-sm text-center text-[var(--color-text-main)] group-hover:text-[var(--color-accent-to)] transition-colors">{{ i18n.t(game.titleKey)() }}</div>
              </div>
            }
          </div>
        </div>
      }
      </div>
    </div>
  `
})
export class GameResultOverlayComponent implements OnInit, OnDestroy {
  i18n = inject(I18nService);
  audio = inject(AudioService);
  private router = inject(Router);
  private gameRegistry = inject(GameRegistryService);
  private adService = inject(AdService);
  authStore = inject(AuthStore);

  @Input() currentGameId?: string;

  @Input({ required: true }) status!: 'win' | 'lose';
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() promptText?: string;
  @Input() stats?: { label: string, value: string | number }[];
  @Input() showNextLevel = false;
  @Input() disableAudio: boolean = false;
  @Input() showRestart = false;
  @Input() showCancel = false;
  @Input() showDismiss = false;
  @Input() showLeave = false;

  @Output() nextLevel = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
  @Output() leave = new EventEmitter<void>();

  private audioPlayed = false;
  recommendedGames: GameConfig[] = [];

  ngOnInit() {
    this.playEffect();
    this.loadRecommendations();
  }

  private loadRecommendations() {
    if (!this.currentGameId) return;
    const config = this.gameRegistry.getConfig(this.currentGameId);
    if (config && config.recommendations) {
      this.recommendedGames = config.recommendations
        .map(id => this.gameRegistry.getConfig(id))
        .filter((c): c is GameConfig => !!c);
    }
  }

  t(key: string): string {
    return this.i18n.t(key)();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  handleLeave() {
    this.adService.tryShowInterstitial(() => this.leave.emit());
  }

  handleRestart() {
    this.adService.tryShowInterstitial(() => this.restart.emit());
  }

  handleNextLevel() {
    this.adService.tryShowInterstitial(() => this.nextLevel.emit());
  }

  handleDismiss() {
    this.adService.tryShowInterstitial(() => this.dismiss.emit());
  }

  handleGoToGame(gameId: string) {
    this.adService.tryShowInterstitial(() => {
      this.router.navigate(['/games', gameId]);
    });
  }

  // Play effect only once per component lifecycle to avoid double-playing
  private playEffect() {
    if (this.audioPlayed || this.disableAudio) return;
    this.audioPlayed = true;

    if (this.status === 'win') {
      this.audio.playWin();
    } else {
      this.audio.playLose();
    }
  }

  ngOnDestroy() {
    this.audioPlayed = false;
  }
}
