import { Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { GameRegistryService } from '../../../core/services/game-registry.service';

@Component({
  selector: 'app-game-pk-mode-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (mode() !== 'single') {
      <div class="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-bg-sub)] border border-[var(--color-border-card)] shadow-inner text-xs sm:text-sm text-[var(--color-text-main)] font-bold">
        <span class="text-[var(--color-accent-from)]">{{ modeLabel() }}</span>
        <span class="text-[var(--color-text-muted)]">|</span>
        <span>{{ diffLabel() }}</span>
        @if (diffDesc()) {
          <span class="text-[var(--color-text-muted)] font-normal text-xs ml-1 hidden lg:inline-block opacity-80"> - {{ diffDesc() }}</span>
        }
      </div>
    }
  `
})
export class GamePkModeBadgeComponent {
  i18n = inject(I18nService);
  registry = inject(GameRegistryService);

  @Input({ required: true }) gameId!: string;
  @Input({ required: true }) set mode(val: string | unknown) { this._mode.set(val as string); }
  @Input({ required: true }) set difficulty(val: string | unknown) { this._diff.set(val as string); }

  private _mode = signal<string>('');
  private _diff = signal<string>('');
  
  mode = this._mode;

  modeLabel = computed(() => {
    const m = this._mode();
    if (m === 'single' || !m) return '';
    const conf = this.registry.getConfig(this.gameId);
    const modeObj = conf?.modes.find(x => x.id === m);
    return modeObj?.labelKey ? this.i18n.t(modeObj.labelKey as any)() : m;
  });

  diffLabel = computed(() => {
    const d = this._diff();
    if (!d) return '';
    const conf = this.registry.getConfig(this.gameId);
    const diffObj = conf?.difficulties.find(x => x.id === d);
    return diffObj?.labelKey ? this.i18n.t(diffObj.labelKey as any)() : d;
  });

  diffDesc = computed(() => {
    const d = this._diff();
    if (!d) return '';
    const conf = this.registry.getConfig(this.gameId);
    const diffObj = conf?.difficulties.find(x => x.id === d);
    return diffObj?.descKey ? this.i18n.t(diffObj.descKey as any)() : (diffObj?.desc || '');
  });
}
