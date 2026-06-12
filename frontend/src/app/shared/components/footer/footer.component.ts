import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment as versionEnv } from '../../../../environments/version';
import { environment as appEnvironment } from '../../../../environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="w-full mt-auto pt-16 pb-8 flex flex-col items-center justify-center text-[var(--color-text-muted)] text-sm opacity-60">
      <div class="flex items-center gap-3 sm:gap-6 mb-4 flex-wrap justify-center font-medium">
        <a routerLink="/legal/privacy" class="hover:text-[var(--color-text-main)] transition-colors">Privacy Policy</a>
        <span class="w-1 h-1 rounded-full bg-[var(--color-text-muted)]"></span>
        <a routerLink="/legal/terms" class="hover:text-[var(--color-text-main)] transition-colors">Terms of Service</a>
        <span class="w-1 h-1 rounded-full bg-[var(--color-text-muted)]"></span>
        <a routerLink="/legal/about" class="hover:text-[var(--color-text-main)] transition-colors">About Us / Contact</a>
      </div>
      <p>© 2026 Puzzle PK. All rights reserved.</p>
      <div class="flex items-center gap-4 mt-2 font-mono text-xs">
        <span>Frontend: {{ frontendVersion }}</span>
        <span class="w-1 h-1 rounded-full bg-[var(--color-text-muted)]"></span>
        <span>Backend: {{ backendVersion() }}</span>
      </div>
    </div>
  `
})
export class FooterComponent implements OnInit {
  private http = inject(HttpClient);
  
  frontendVersion = versionEnv.version;
  backendVersion = signal('loading...');

  ngOnInit() {
    this.http.get<{version: string}>(`${appEnvironment.apiUrl}/version`).subscribe({
      next: (res) => this.backendVersion.set(res.version),
      error: () => this.backendVersion.set('unknown')
    });
  }
}
