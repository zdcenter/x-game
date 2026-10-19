import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-difficulty-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative group z-20 flex items-center">
      <div class="absolute left-2 sm:left-2.5 pointer-events-none text-xs sm:text-sm select-none z-10 group-hover:scale-110 transition-transform">
        🎯
      </div>
      <select class="appearance-none bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[var(--color-text-main)] pl-6 sm:pl-8 pr-6 sm:pr-8 py-1 sm:py-1.5 rounded-xl outline-none hover:border-amber-500/60 focus:border-amber-500 transition-all cursor-pointer font-bold text-xs sm:text-sm shadow-sm hover:shadow-md backdrop-blur-md max-w-[140px] sm:max-w-none truncate"
              [ngModel]="currentDifficulty" (ngModelChange)="onDifficultyChange($event)">
        @for (diff of availableDifficulties; track diff.id) {
          <option [value]="diff.id">
            {{ i18n.t(diff.labelKey)() }}
            @if (diff.descKey || diff.desc) {
              ({{ diff.descKey ? i18n.t(diff.descKey)() : diff.desc }})
            }
          </option>
        }
      </select>
      <div class="absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 pointer-events-none text-[var(--color-text-muted)] group-hover:text-amber-500 transition-colors">
        <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  `
})
export class DifficultySelectorComponent {
  i18n = inject(I18nService);
  
  @Input({ required: true }) availableDifficulties: { id: string, labelKey: string, descKey?: string, desc?: string }[] = [];
  @Input({ required: true }) currentDifficulty: string = '';
  
  @Output() difficultyChange = new EventEmitter<string>();

  onDifficultyChange(newDiff: string) {
    this.difficultyChange.emit(newDiff);
  }
}
