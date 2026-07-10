import { Injectable, signal, effect } from '@angular/core';
import { isBrowser, storageGet, storageSet } from '../utils/browser.util';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly defaultTheme: Theme = (storageGet('theme') as Theme) || 'light';
  readonly currentTheme = signal<Theme>(this.defaultTheme === 'dark' || this.defaultTheme === 'light' ? this.defaultTheme : 'light');

  constructor() {
    // Automatically apply the theme class to the body element whenever the signal changes
    effect(() => {
      const theme = this.currentTheme();
      if (isBrowser()) {
        document.body.className = `theme-${theme}`;
      }
      storageSet('theme', theme);
    });
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
  }

  cycleTheme() {
    const themes: Theme[] = ['dark', 'light'];
    const currentIndex = themes.indexOf(this.currentTheme());
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }
}
