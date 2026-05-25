import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly defaultTheme: Theme = (localStorage.getItem('theme') as Theme) || 'dark';
  readonly currentTheme = signal<Theme>(this.defaultTheme === 'cyberpunk' as any ? 'dark' : this.defaultTheme);

  constructor() {
    // Automatically apply the theme class to the body element whenever the signal changes
    effect(() => {
      const theme = this.currentTheme();
      document.body.className = `theme-${theme}`;
      localStorage.setItem('theme', theme);
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
