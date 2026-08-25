import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="w-full mt-auto border-t py-12 transition-colors duration-300 relative z-10" style="background-color: var(--color-bg-main); border-color: var(--color-border-card)">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          
          <!-- Brand & Intro -->
          <div class="col-span-1 md:col-span-2 lg:col-span-2">
            <a [routerLink]="['/', i18n.currentLang(), 'lobby']" class="inline-block mb-4">
              <span class="text-2xl font-black tracking-widest bg-clip-text text-transparent"
                    style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                Puzzle PK
              </span>
            </a>
            <p class="text-sm leading-relaxed max-w-md" style="color: var(--color-text-secondary)">
              {{ i18n.t('footer.description')() || 'Puzzle PK is your ultimate destination for free online logic puzzles and multiplayer mind games. Challenge your brain, compete with friends, and improve your cognitive skills daily.' }}
            </p>
          </div>

          <!-- Quick Links (Games) -->
          <div>
            <h3 class="font-bold text-lg mb-4" style="color: var(--color-text-primary)">
              {{ i18n.t('footer.games')() || 'Popular Games' }}
            </h3>
            <ul class="space-y-3 text-sm">
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'games', 'minesweeper']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.t('lobby.minesweeper')() || 'Minesweeper' }}
                </a>
              </li>
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'games', 'sudoku']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.t('lobby.sudoku')() || 'Sudoku' }}
                </a>
              </li>
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'games', 'classic2048']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.t('lobby.classic2048')() || '2048' }}
                </a>
              </li>
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'games', 'gomoku']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.t('lobby.gomoku')() || 'Gomoku' }}
                </a>
              </li>
            </ul>
          </div>
          <!-- Resources -->
          <div>
            <h3 class="font-bold text-lg mb-4" style="color: var(--color-text-primary)">
              {{ i18n.currentLang() === 'zh' ? '探索' : 'Explore' }}
            </h3>
            <ul class="space-y-3 text-sm">
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'docs']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.currentLang() === 'zh' ? '经典益智游戏说明' : 'Game Guides' }}
                </a>
              </li>
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'blog']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.currentLang() === 'zh' ? '开发博客' : 'Developer Blog' }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Legal & Trust Pages -->
          <div>
            <h3 class="font-bold text-lg mb-4" style="color: var(--color-text-primary)">
              {{ i18n.t('footer.about')() || 'About Us' }}
            </h3>
            <ul class="space-y-3 text-sm">
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'legal', 'about']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.t('legal.about.title')() || 'About Us' }}
                </a>
              </li>
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'legal', 'privacy']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.t('legal.privacy.title')() || 'Privacy Policy' }}
                </a>
              </li>
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'legal', 'terms']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.t('legal.terms.title')() || 'Terms of Service' }}
                </a>
              </li>
              <li>
                <a [routerLink]="['/', i18n.currentLang(), 'legal', 'contact']" class="hover:underline transition-colors" style="color: var(--color-text-secondary)">
                  {{ i18n.t('legal.contact.title')() || 'Contact Us' }}
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div class="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style="border-color: var(--color-border-card)">
          <p class="text-sm" style="color: var(--color-text-muted)">
            &copy; 2026 Puzzle PK. All rights reserved.
          </p>
          <div class="flex space-x-6 text-sm" style="color: var(--color-text-muted)">
            <span>Made with ❤️ for puzzle lovers</span>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  i18n = inject(I18nService);
}
