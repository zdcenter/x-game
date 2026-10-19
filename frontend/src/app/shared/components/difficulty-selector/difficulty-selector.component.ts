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
      <!-- Visual Display Capsule -->
      <div class="flex items-center gap-1 sm:gap-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[var(--color-text-main)] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm group-hover:border-amber-500/60 group-hover:shadow-md transition-all backdrop-blur-md pointer-events-none select-none max-w-[105px] xs:max-w-[125px] sm:max-w-none">
        <span class="text-xs sm:text-sm shrink-0">🎯</span>
        <span class="truncate sm:hidden text-[11px] font-bold">{{ currentLabelShort }}</span>
        <span class="truncate hidden sm:inline">{{ currentLabelFull }}</span>
        <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--color-text-muted)] group-hover:text-amber-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      <!-- Invisible Native Select for 100% Native Mobile Picker Compatibility -->
      <select class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
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
    </div>
  `
})
export class DifficultySelectorComponent {
  i18n = inject(I18nService);
  
  @Input({ required: true }) availableDifficulties: { id: string, labelKey: string, descKey?: string, desc?: string }[] = [];
  @Input({ required: true }) currentDifficulty: string = '';
  
  @Output() difficultyChange = new EventEmitter<string>();

  get currentDiffItem() {
    return this.availableDifficulties.find(d => d.id === this.currentDifficulty) || this.availableDifficulties[0];
  }

  get currentLabelShort(): string {
    const item = this.currentDiffItem;
    return item ? this.i18n.t(item.labelKey)() : '';
  }

  get currentLabelFull(): string {
    const item = this.currentDiffItem;
    if (!item) return '';
    const label = this.i18n.t(item.labelKey)();
    const desc = item.descKey ? this.i18n.t(item.descKey)() : item.desc;
    return desc ? `${label} (${desc})` : label;
  }

  onDifficultyChange(newDiff: string) {
    this.difficultyChange.emit(newDiff);
  }
}
