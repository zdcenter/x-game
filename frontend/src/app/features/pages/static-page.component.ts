import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      <div class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl shadow-xl overflow-hidden">
        
        <!-- Header -->
        <div class="px-6 py-8 border-b border-[var(--color-border-card)] bg-[var(--color-bg-main)]">
          <h1 class="text-3xl font-black text-transparent bg-clip-text"
              style="background-image: linear-gradient(to right, var(--color-text-primary), var(--color-text-secondary))">
            {{ i18n.t('pages.title.' + pageId())() || pageId() | titlecase }}
          </h1>
          <p class="mt-2 text-sm text-[var(--color-text-muted)]">
            {{ i18n.t('pages.lastUpdated')() || 'Last Updated' }}: 2026-07-08
          </p>
        </div>

        <!-- Content -->
        <div class="p-6 sm:p-10 prose prose-invert prose-lg max-w-none
                    [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[var(--color-text-primary)] [&_h2]:mt-8 [&_h2]:mb-4
                    [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-[var(--color-text-primary)] [&_h3]:mt-6 [&_h3]:mb-3
                    [&_p]:text-[var(--color-text-secondary)] [&_p]:mb-4 [&_p]:leading-relaxed
                    [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_ul]:text-[var(--color-text-secondary)] [&_li]:mb-2
                    [&_a]:text-[var(--color-accent-from)] [&_a]:underline hover:[&_a]:text-[var(--color-accent-to)]"
             [innerHTML]="i18n.t('pages.content.' + pageId())() || 'Content not found.'">
        </div>
        
      </div>
    </div>
  `
})
export class StaticPageComponent {
  i18n = inject(I18nService);
  private route = inject(ActivatedRoute);

  pageId = signal<string>('');

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.pageId.set(id);
      }
    });
  }
}
