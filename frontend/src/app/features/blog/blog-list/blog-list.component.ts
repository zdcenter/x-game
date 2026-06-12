import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BlogService, BlogPostMeta } from '../../../core/services/blog.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FooterComponent],
  template: `
    <div class="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)] py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <header class="text-center mb-16">
          <h1 class="text-4xl sm:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            {{ i18n.t('blog.title')() }}
          </h1>
          <p class="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            {{ i18n.t('blog.subtitle')() }}
          </p>
        </header>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (post of displayPosts(); track post.id) {
            <article class="bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group">
              <div class="flex flex-wrap gap-2 mb-4">
                @for (tag of post.meta.tags; track tag) {
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                    {{ tag }}
                  </span>
                }
              </div>
              <h2 class="text-2xl font-bold mb-3 group-hover:text-emerald-400 transition-colors">
                <a [routerLink]="['/blog', post.id]">{{ post.meta.title }}</a>
              </h2>
              <p class="text-[var(--color-text-secondary)] mb-6 line-clamp-3">
                {{ post.meta.description }}
              </p>
              <div class="flex items-center justify-between text-sm text-[var(--color-text-muted)] border-t border-[var(--color-border-card)] pt-4">
                <span>{{ post.date }}</span>
                <span>{{ post.meta.readTime }}</span>
              </div>
            </article>
          }

          @if (displayPosts().length === 0 && !loading()) {
            <div class="col-span-full text-center py-12 text-[var(--color-text-muted)]">
              {{ i18n.t('blog.no_articles')() }}
            </div>
          }
          
          @if (loading()) {
            <div class="col-span-full flex justify-center py-12">
              <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }
        </div>
        
        <div class="mt-16 w-full">
          <app-footer></app-footer>
        </div>
      </div>
    </div>
  `
})
export class BlogListComponent implements OnInit {
  private blogService = inject(BlogService);
  i18n = inject(I18nService);
  
  rawPosts = signal<BlogPostMeta[]>([]);
  loading = signal(true);

  // Dynamically compute the posts with the correct language metadata
  displayPosts = computed(() => {
    const lang = this.i18n.currentLang();
    return this.rawPosts().map(post => ({
      id: post.id,
      date: post.date,
      meta: lang === 'zh' ? post.zh : post.en
    }));
  });

  ngOnInit() {
    this.blogService.getBlogPosts().subscribe({
      next: (data) => {
        // Sort by date descending
        this.rawPosts.set(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load blog posts', err);
        this.loading.set(false);
      }
    });
  }
}
