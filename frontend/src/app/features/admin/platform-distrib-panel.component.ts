import { Component, input, output } from '@angular/core';
import { PLATFORM_DEFS, PlatformId } from '../../core/services/platform-formatter.service';

@Component({
  selector: 'app-platform-distrib-panel',
  standalone: true,
  template: `
    @if (loading()) {
      <div class="text-xs opacity-40 py-2">加载内容中...</div>
    } @else {
      <div class="flex flex-wrap gap-2">
        @for (p of platforms; track p.id) {
          <div class="relative group/tip flex items-center gap-1.5 bg-[var(--color-bg-main)]/60 rounded-lg px-2.5 py-1.5 border border-[var(--color-border-card)]/40 hover:border-cyan-500/30 transition-colors">
            <!-- Tooltip -->
            <div class="pointer-events-none absolute bottom-full left-0 mb-2 w-52 z-20
                        invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100
                        transition-opacity duration-150">
              <div class="bg-slate-800 border border-slate-600/60 text-slate-200 text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed">
                <span class="font-bold text-white">{{ p.name }}</span><br>
                {{ p.hint }}
              </div>
              <div class="w-2 h-2 bg-slate-800 border-b border-r border-slate-600/60 rotate-45 ml-3 -mt-1"></div>
            </div>
            <span class="text-base leading-none">{{ p.icon }}</span>
            <span class="text-xs font-bold text-[var(--color-text-muted)]">{{ p.name }}</span>
            @if (hasLang(p.langs, 'zh')) {
              <button (click)="emit(p.id, 'zh'); $event.stopPropagation()"
                [disabled]="distribKey() === p.id + '_zh'"
                class="px-2 py-0.5 text-xs rounded font-medium border transition-colors disabled:opacity-40"
                [class]="distribKey() === p.id + '_zh'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'border-[var(--color-border-card)] hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-400'">
                {{ distribKey() === p.id + '_zh' ? '✓' : 'ZH' }}
              </button>
            }
            @if (hasLang(p.langs, 'en')) {
              <button (click)="emit(p.id, 'en'); $event.stopPropagation()"
                [disabled]="distribKey() === p.id + '_en'"
                class="px-2 py-0.5 text-xs rounded font-medium border transition-colors disabled:opacity-40"
                [class]="distribKey() === p.id + '_en'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'border-[var(--color-border-card)] hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-400'">
                {{ distribKey() === p.id + '_en' ? '✓' : 'EN' }}
              </button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class PlatformDistribPanelComponent {
  distribKey = input('');
  loading    = input(false);
  copy       = output<{ platformId: PlatformId; lang: 'en' | 'zh' }>();

  readonly platforms = PLATFORM_DEFS;

  hasLang(langs: readonly string[], lang: string): boolean {
    return langs.includes(lang);
  }

  emit(platformId: PlatformId, lang: 'en' | 'zh') {
    this.copy.emit({ platformId, lang });
  }
}
