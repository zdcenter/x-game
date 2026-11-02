import { Component, Input, Output, EventEmitter, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ResumeGameService, SavedGameSession } from '../../../core/services/resume-game.service';
import { HapticService } from '../../../core/services/haptic.service';

@Component({
  selector: 'app-resume-game-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (session) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none"
           (click)="$event.stopPropagation()">
        <div class="relative w-full max-w-sm sm:max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden animate-scaleUp">

          <!-- Ambient Decorative Ring -->
          <div class="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none"></div>

          <!-- Header Icon & Title -->
          <div class="flex items-center gap-3.5 mb-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-inner">
              {{ gameEmoji || '💾' }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-black text-base sm:text-lg text-[var(--color-text-main)] truncate">
                {{ i18n.t('resume.title')() }}
              </h3>
              <p class="text-xs text-[var(--color-text-muted)] line-clamp-1">
                {{ gameTitle || i18n.t('resume.desc')() }}
              </p>
            </div>
          </div>

          <!-- Progress Bar & Key Indicators -->
          <div class="my-4 p-3.5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] flex flex-col gap-3">
            <!-- Progress Row -->
            <div>
              <div class="flex items-center justify-between text-xs mb-1.5 font-bold">
                <span class="text-[var(--color-text-muted)] flex items-center gap-1">
                  🎯 {{ i18n.t('resume.progress')() }}
                </span>
                <span class="text-emerald-400 font-mono text-sm">
                  {{ session.progressPercent }}%
                </span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
                <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-xs shadow-emerald-500/50"
                     [style.width.%]="session.progressPercent">
                </div>
              </div>
            </div>

            <!-- 3 Mini Stats -->
            <div class="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--color-border-card)]/60 text-center">
              <!-- Time Spent -->
              <div class="flex flex-col items-center">
                <span class="text-[10px] text-[var(--color-text-muted)]">⏱️ {{ i18n.t('resume.time_spent')() }}</span>
                <span class="text-xs sm:text-sm font-bold font-mono text-[var(--color-text-main)] mt-0.5">
                  {{ resumeService.formatTime(session.timeElapsed) }}
                </span>
              </div>

              <!-- Difficulty / Moves -->
              <div class="flex flex-col items-center border-x border-[var(--color-border-card)]/60 px-1">
                <span class="text-[10px] text-[var(--color-text-muted)]">
                  {{ session.score !== undefined ? ('💎 ' + i18n.t('resume.score')()) : ('⚡ ' + i18n.t('resume.difficulty')()) }}
                </span>
                <span class="text-xs sm:text-sm font-bold text-amber-400 truncate max-w-full mt-0.5">
                  {{ session.score !== undefined ? session.score : (resumeService.getDifficultyLabel(session.difficulty, session.gameId) || session.difficultyLabel || session.difficulty || '-') }}
                </span>
              </div>

              <!-- Saved Time Ago -->
              <div class="flex flex-col items-center">
                <span class="text-[10px] text-[var(--color-text-muted)]">📅 {{ i18n.t('resume.saved_time')() || '存档' }}</span>
                <span class="text-xs font-medium text-[var(--color-text-muted)] mt-0.5">
                  {{ resumeService.formatTimeAgo(session.timestamp) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons Deck -->
          <div class="flex flex-col gap-2 mt-4">
            <button (click)="handleResume()"
                    class="w-full py-3 sm:py-3.5 px-4 rounded-xl font-black text-sm sm:text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <span>⚡</span>
              <span>{{ i18n.t('resume.btn_continue')() }}</span>
            </button>

            <button (click)="handleDiscard()"
                    class="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <span>🔄</span>
              <span>{{ i18n.t('resume.btn_discard')() }}</span>
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.94); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }
    .animate-scaleUp {
      animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class ResumeGameDialogComponent {
  i18n = inject(I18nService);
  resumeService = inject(ResumeGameService);
  private haptic = inject(HapticService);

  @Input() session: SavedGameSession | null = null;
  @Input() gameEmoji?: string;
  @Input() gameTitle?: string;

  @Output() resume = new EventEmitter<SavedGameSession>();
  @Output() discard = new EventEmitter<void>();

  @HostListener('window:keydown.enter')
  onEnter() {
    if (this.session) {
      this.handleResume();
    }
  }

  handleResume() {
    if (!this.session) return;
    this.haptic.vibrateLight();
    this.resume.emit(this.session);
  }

  handleDiscard() {
    this.haptic.vibrateLight();
    this.discard.emit();
  }
}
