import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment as versionEnv } from '../../../../environments/version';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="w-full mt-auto border-t pt-8 pb-6" style="border-color: var(--color-border-card)">
      <div class="max-w-4xl mx-auto px-6">

        <!-- 3-column nav -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-8 mb-8">

          <!-- Column 1: Play -->
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest mb-3" style="color: var(--color-text-secondary)">
              {{ i18n.t('footer.play')() }}
            </h4>
            <ul class="space-y-2.5">
              <li><a routerLink="/lobby"       class="text-sm transition-colors hover:text-[var(--color-text-main)]" style="color: var(--color-text-muted)">{{ i18n.t('nav.lobby')() }}</a></li>
              <li><a routerLink="/leaderboard" class="text-sm transition-colors hover:text-[var(--color-text-main)]" style="color: var(--color-text-muted)">{{ i18n.t('leaderboard.title')() }}</a></li>
              <li><a routerLink="/daily"       class="text-sm transition-colors hover:text-[var(--color-text-main)]" style="color: var(--color-text-muted)">{{ i18n.t('daily.title')() }}</a></li>
            </ul>
          </div>

          <!-- Column 2: Resources -->
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest mb-3" style="color: var(--color-text-secondary)">
              {{ i18n.t('footer.resources')() }}
            </h4>
            <ul class="space-y-2.5">
              <li><a routerLink="/docs" class="text-sm transition-colors hover:text-[var(--color-text-main)]" style="color: var(--color-text-muted)">{{ i18n.t('docs.title')() }}</a></li>
              <li><a routerLink="/blog" class="text-sm transition-colors hover:text-[var(--color-text-main)]" style="color: var(--color-text-muted)">Blog</a></li>
            </ul>
          </div>

          <!-- Column 3: Legal -->
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest mb-3" style="color: var(--color-text-secondary)">
              {{ i18n.t('footer.legal')() }}
            </h4>
            <ul class="space-y-2.5">
              <li><a routerLink="/legal/privacy" class="text-sm transition-colors hover:text-[var(--color-text-main)]" style="color: var(--color-text-muted)">{{ i18n.t('legal.privacy.title')() }}</a></li>
              <li><a routerLink="/legal/terms"   class="text-sm transition-colors hover:text-[var(--color-text-main)]" style="color: var(--color-text-muted)">{{ i18n.t('legal.terms.title')() }}</a></li>
              <li><a routerLink="/legal/about"   class="text-sm transition-colors hover:text-[var(--color-text-main)]" style="color: var(--color-text-muted)">{{ i18n.t('legal.about.title')() }}</a></li>
            </ul>
          </div>
        </div>

        <!-- Copyright — static, no async content to prevent CLS -->
        <div class="text-center text-xs" style="color: var(--color-text-muted); opacity: 0.6">
          <p>© 2026 Puzzle PK. All rights reserved.</p>
          <p class="mt-1 font-mono">{{ frontendVersion }}</p>
        </div>

      </div>
    </footer>
  `
})
export class FooterComponent {
  i18n = inject(I18nService);
  frontendVersion = versionEnv.version;
}
