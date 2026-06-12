import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] text-[var(--color-text-main)] py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mx-auto bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xl rounded-2xl overflow-hidden">
        
        <!-- Header -->
        <div class="bg-[var(--color-bg-base)] border-b border-[var(--color-border-card)] px-6 py-8 sm:px-10 text-center relative">
          <a routerLink="/" class="absolute left-4 top-4 sm:left-6 sm:top-6 text-[var(--color-text-muted)] hover:text-[var(--color-accent-from)] transition-colors flex items-center gap-1 text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </a>
          <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight mt-6 sm:mt-2 text-transparent bg-clip-text"
              style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
            {{ title() }}
          </h1>
        </div>

        <!-- Content -->
        <div class="px-6 py-8 sm:px-10 leading-relaxed text-sm sm:text-base opacity-90 whitespace-pre-line">
          {{ content() }}
        </div>

      </div>
    </div>
  `
})
export class LegalComponent {
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);

  private paramsSig = toSignal(this.route.params);

  title = computed(() => {
    const type = this.paramsSig()?.['type'] || 'privacy';
    return this.i18n.t(`legal.${type}.title`)() || 'Legal Document';
  });

  content = computed(() => {
    const type = this.paramsSig()?.['type'] || 'privacy';
    return this.i18n.t(`legal.${type}.content`)() || 'Document content not found.';
  });
}
