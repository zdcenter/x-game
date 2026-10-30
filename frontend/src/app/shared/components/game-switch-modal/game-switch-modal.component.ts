import { Component, inject, signal, computed, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameSwitchService } from '../../../core/services/game-switch.service';
import { GameRegistryService, GameConfig } from '../../../core/services/game-registry.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HapticService } from '../../../core/services/haptic.service';
import { AudioService } from '../../../core/services/audio.service';
import { GameMode } from '../../../core/models/game.model';

@Component({
  selector: 'app-game-switch-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (switchService.isOpen()) {
      <div class="fixed inset-0 z-[120] flex items-center justify-center p-2.5 sm:p-4 animate-fade-in"
           style="overscroll-behavior: contain;">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-md" (click)="close()"></div>

        <!-- Modal Card -->
        <div class="relative w-full max-w-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] p-4 sm:p-6 overflow-hidden z-10 flex flex-col max-h-[92dvh] animate-scale-up"
             (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 sm:pb-4 border-b border-[var(--color-border-card)] shrink-0">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0">
                🎮
              </div>
              <div class="min-w-0">
                <h3 class="text-base sm:text-lg font-black text-[var(--color-text-main)] truncate">
                  {{ i18n.t('game.switch_pk_game')() || '更换对战游戏' }}
                </h3>
                <p class="text-[11px] sm:text-xs text-[var(--color-text-muted)] truncate">
                  {{ i18n.t('game.switch_pk_game_desc')() || '与对手无缝切换至其他游戏或难度，无需退出房间' }}
                </p>
              </div>
            </div>

            <button type="button"
                    (click)="close()"
                    class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors active:scale-95 cursor-pointer shrink-0"
                    [attr.aria-label]="i18n.t('common.close')() || 'Close'">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Search Bar -->
          <div class="pt-3 pb-2 shrink-0">
            <div class="relative w-full">
              <span class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                🔍
              </span>
              <input type="text"
                     [(ngModel)]="searchQuery"
                     [placeholder]="i18n.t('lobby.search_placeholder')() || '搜索游戏...'"
                     class="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all shadow-inner" />
              @if (searchQuery()) {
                <button (click)="searchQuery.set('')"
                        class="absolute inset-y-0 right-2.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xs cursor-pointer">
                  ✕
                </button>
              }
            </div>
          </div>

          <!-- Game List Grid (Scrollable) -->
          <div class="flex-1 overflow-y-auto min-h-0 pr-1 py-1 custom-scrollbar space-y-3">
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              @for (game of filteredGames(); track game.id) {
                <button type="button"
                        (click)="selectGame(game.id)"
                        class="p-2 sm:p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer relative"
                        [ngClass]="selectedGameId() === game.id
                          ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/50 scale-[1.02]'
                          : 'border-[var(--color-border-card)] bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)]/40 hover:border-amber-400/50 hover:scale-[1.01]'">
                  
                  <!-- Selected Check Badge -->
                  @if (selectedGameId() === game.id) {
                    <span class="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-xs">
                      ✓
                    </span>
                  }

                  <!-- Game Icon -->
                  <span class="text-2xl sm:text-3xl transition-transform group-hover:scale-110 drop-shadow-sm">
                    {{ game.iconEmoji }}
                  </span>

                  <!-- Game Title -->
                  <span class="text-xs sm:text-sm font-bold text-[var(--color-text-main)] line-clamp-1 w-full leading-tight">
                    {{ getGameTitle(game) }}
                  </span>

                  <!-- Mode Badge -->
                  @if (hasMultiplayer(game)) {
                    <span class="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      ⚔️ PK
                    </span>
                  }
                </button>
              }
            </div>

            <!-- Dynamic Difficulty & Mode Panel (自动根据选定游戏展开) -->
            @if (activeGameConfig(); as cfg) {
              <div class="p-3 sm:p-4 rounded-2xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] shadow-xs flex flex-col gap-3 animate-fade-in">
                <!-- Selected Game Summary -->
                <div class="flex items-center justify-between border-b border-[var(--color-border-card)]/60 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">{{ cfg.iconEmoji }}</span>
                    <span class="text-xs sm:text-sm font-black text-[var(--color-text-main)]">
                      {{ getGameTitle(cfg) }}
                    </span>
                  </div>
                  <span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                    {{ i18n.t('game.select_difficulty')() || '选择难度' }}
                  </span>
                </div>

                <!-- Difficulties -->
                @if (cfg.difficulties.length > 0) {
                  <div>
                    <div class="text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1">
                      <span>🎯</span>
                      <span>{{ i18n.t('game.difficulty')() || '游戏难度' }}</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 sm:gap-2">
                      @for (diff of cfg.difficulties; track diff.id) {
                        <button type="button"
                                (click)="selectDifficulty(diff.id)"
                                class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1"
                                [ngClass]="selectedDifficulty() === diff.id
                                  ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20 scale-105'
                                  : 'bg-[var(--color-bg-card)] border-[var(--color-border-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:border-amber-400/40'">
                          @if (selectedDifficulty() === diff.id) {
                            <span class="text-[10px]">✓</span>
                          }
                          <span>{{ getDifficultyLabel(diff) }}</span>
                        </button>
                      }
                    </div>
                  </div>
                }

                <!-- Modes (If Multiple PK Modes exist) -->
                @if (multiplayerModes().length > 1) {
                  <div>
                    <div class="text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1">
                      <span>⚔️</span>
                      <span>{{ i18n.t('game.select_mode')() || '对决模式' }}</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 sm:gap-2">
                      @for (m of multiplayerModes(); track m.id) {
                        <button type="button"
                                (click)="selectMode(m.id)"
                                class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1"
                                [ngClass]="selectedMode() === m.id
                                  ? 'bg-blue-500 text-white font-black border-blue-400 shadow-md shadow-blue-500/20 scale-105'
                                  : 'bg-[var(--color-bg-card)] border-[var(--color-border-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:border-blue-400/40'">
                          @if (selectedMode() === m.id) {
                            <span class="text-[10px]">✓</span>
                          }
                          <span>{{ getModeLabel(m) }}</span>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Bottom Action Bar -->
          <div class="pt-3 sm:pt-4 border-t border-[var(--color-border-card)] flex items-center justify-end gap-2 sm:gap-3 shrink-0">
            <button type="button"
                    (click)="close()"
                    class="px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[var(--color-bg-main)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] border border-[var(--color-border-card)] hover:bg-[var(--color-border-card)]/40 transition-all active:scale-95 cursor-pointer">
              {{ i18n.t('common.cancel')() || '取消' }}
            </button>

            <button type="button"
                    (click)="confirmSwitch()"
                    [disabled]="!selectedGameId()"
                    class="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none">
              <span>🎮</span>
              <span>{{ i18n.t('game.confirm_switch_game')() || '确认切换并开局' }}</span>
              <span>→</span>
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class GameSwitchModalComponent {
  switchService = inject(GameSwitchService);
  gameRegistry = inject(GameRegistryService);
  i18n = inject(I18nService);
  haptic = inject(HapticService);
  audio = inject(AudioService);

  searchQuery = signal<string>('');
  selectedGameId = signal<string>('');
  selectedDifficulty = signal<string>('medium');
  selectedMode = signal<string>('');

  allGames = computed(() => this.gameRegistry.getAllConfigs());

  filteredGames = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.allGames();
    if (!q) return list;
    return list.filter(g => {
      const title = this.getGameTitle(g).toLowerCase();
      return title.includes(q) || g.id.toLowerCase().includes(q);
    });
  });

  activeGameConfig = computed(() => {
    const id = this.selectedGameId();
    if (!id) return null;
    return this.gameRegistry.getConfig(id) || null;
  });

  multiplayerModes = computed(() => {
    const cfg = this.activeGameConfig();
    if (!cfg) return [];
    return cfg.modes.filter(m => m.id !== GameMode.Single);
  });

  constructor() {
    effect(() => {
      if (this.switchService.isOpen()) {
        const opts = this.switchService.options();
        const initGameId = opts.currentGameId || 'minesweeper';
        this.selectedGameId.set(initGameId);
        this.initDifficultiesForGame(initGameId, opts.currentDifficulty, opts.currentMode);
      }
    });
  }

  private initDifficultiesForGame(gameId: string, preferredDiff?: string, preferredMode?: string) {
    const cfg = this.gameRegistry.getConfig(gameId);
    if (!cfg) return;

    if (preferredDiff && cfg.difficulties?.some(d => d.id === preferredDiff)) {
      this.selectedDifficulty.set(preferredDiff);
    } else if (cfg.difficulties && cfg.difficulties.length > 0) {
      // Prefer medium if exists, else first
      const med = cfg.difficulties.find(d => d.id === 'medium');
      this.selectedDifficulty.set(med ? med.id : cfg.difficulties[0].id);
    } else {
      this.selectedDifficulty.set(preferredDiff || 'medium');
    }

    const mpModes = cfg.modes ? cfg.modes.filter(m => m.id !== GameMode.Single) : [];
    if (preferredMode && mpModes.some(m => m.id === preferredMode)) {
      this.selectedMode.set(preferredMode);
    } else if (mpModes.length > 0) {
      this.selectedMode.set(mpModes[0].id);
    } else if (cfg.modes && cfg.modes.length > 0) {
      this.selectedMode.set(cfg.modes[0].id);
    } else {
      this.selectedMode.set(preferredMode || GameMode.Speed);
    }
  }

  selectGame(gameId: string) {
    this.haptic.vibrateLight();
    this.selectedGameId.set(gameId);
    this.initDifficultiesForGame(gameId);
  }

  selectDifficulty(diffId: string) {
    this.haptic.vibrateLight();
    this.selectedDifficulty.set(diffId);
  }

  selectMode(modeId: string) {
    this.haptic.vibrateLight();
    this.selectedMode.set(modeId);
  }

  getGameTitle(game: GameConfig): string {
    const localized = this.i18n.t(game.titleKey)();
    if (localized && localized !== game.titleKey) return localized;
    const fallback = this.i18n.t(`app.title.${game.id}`)();
    if (fallback && fallback !== `app.title.${game.id}`) return fallback;
    return game.id;
  }

  getDifficultyLabel(diff: { id: string; labelKey: string }): string {
    const loc = this.i18n.t(diff.labelKey)();
    if (loc && loc !== diff.labelKey) return loc;
    const common = this.i18n.t(`game.diff_${diff.id}`)();
    if (common && common !== `game.diff_${diff.id}`) return common;
    return diff.id;
  }

  getModeLabel(mode: { id: string; labelKey: string }): string {
    const loc = this.i18n.t(mode.labelKey)();
    if (loc && loc !== mode.labelKey) return loc;
    return mode.id;
  }

  hasMultiplayer(game: GameConfig): boolean {
    return game.modes.some(m => m.id !== GameMode.Single);
  }

  confirmSwitch() {
    const gameId = this.selectedGameId();
    if (!gameId) return;
    this.haptic.vibrateSuccess?.();
    this.switchService.executeSwitch(gameId, this.selectedDifficulty(), this.selectedMode());
  }

  close() {
    this.switchService.close();
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.switchService.isOpen()) {
      this.close();
    }
  }
}
