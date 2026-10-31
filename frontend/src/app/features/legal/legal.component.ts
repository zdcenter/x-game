import { Component, inject, computed, signal, effect, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { FeedbackService } from '../../core/services/feedback.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-[calc(100vh-64px)] w-full bg-[var(--color-bg-main)] text-[var(--color-text-main)] py-8 sm:py-12">
      <div class="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div class="max-w-5xl mx-auto bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xl rounded-3xl overflow-hidden">
        
        <!-- Header -->
        <div class="bg-[var(--color-bg-base)] border-b border-[var(--color-border-card)] px-6 py-8 sm:px-10 text-center relative">
          <a [routerLink]="['/', i18n.currentLang(), 'lobby']" class="absolute left-4 top-4 sm:left-6 sm:top-6 text-[var(--color-text-muted)] hover:text-[var(--color-accent-from)] transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {{ i18n.t('game.back')() || 'Back' }}
          </a>
          <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight mt-6 sm:mt-2 text-transparent bg-clip-text"
              style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
            {{ title() }}
          </h1>
        </div>

        <!-- Markdown Document Content -->
        <div class="px-6 py-8 sm:px-12 leading-relaxed text-sm sm:text-base prose prose-invert max-w-none" [innerHTML]="contentHtml()">
        </div>

        <!-- Interactive Contact / Feedback Form Section (Only on Contact page) -->
        @if (isContactPage()) {
          <div class="px-6 pb-12 sm:px-12 border-t border-[var(--color-border-card)] pt-8">
            <div class="bg-[var(--color-bg-sub)] border border-[var(--color-border-card)] rounded-2xl p-6 sm:p-8">
              
              @if (!isSubmitted()) {
                <div class="mb-6">
                  <div class="flex items-center gap-2 text-lg sm:text-xl font-bold text-[var(--color-text-main)] mb-1">
                    <span>✉️</span>
                    <span>{{ i18n.t('contact.form_title')() }}</span>
                  </div>
                  <p class="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                    {{ i18n.t('contact.form_subtitle')() }}
                  </p>
                </div>

                <form (ngSubmit)="submitContact()" class="space-y-4">
                  <!-- Type Selector -->
                  <div>
                    <label class="block text-xs sm:text-sm font-semibold text-[var(--color-text-main)] mb-1.5">
                      {{ i18n.t('contact.type_label')() }}
                    </label>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      @for (item of inquiryTypes; track item.value) {
                        <button type="button"
                                (click)="inquiryType = item.value"
                                [class.border-[var(--color-accent-from)]]="inquiryType === item.value"
                                [class.bg-[var(--color-bg-card)]]="inquiryType === item.value"
                                [class.text-[var(--color-accent-from)]]="inquiryType === item.value"
                                [class.border-[var(--color-border-card)]]="inquiryType !== item.value"
                                class="p-2 sm:p-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all text-center truncate cursor-pointer hover:border-[var(--color-accent-from)]/60">
                          {{ i18n.t(item.labelKey)() }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Name and Contact -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs sm:text-sm font-semibold text-[var(--color-text-main)] mb-1.5">
                        {{ i18n.t('contact.name_label')() }}
                      </label>
                      <input type="text"
                             [(ngModel)]="contactName"
                             name="contactName"
                             [placeholder]="i18n.t('contact.name_placeholder')()"
                             class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-from)] transition-colors">
                    </div>

                    <div>
                      <label class="block text-xs sm:text-sm font-semibold text-[var(--color-text-main)] mb-1.5">
                        {{ i18n.t('contact.email_label')() }} <span class="text-rose-500">*</span>
                      </label>
                      <input type="text"
                             [(ngModel)]="contactInfo"
                             name="contactInfo"
                             required
                             [placeholder]="i18n.t('contact.email_placeholder')()"
                             class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-from)] transition-colors">
                    </div>
                  </div>

                  <!-- Message Content -->
                  <div>
                    <label class="block text-xs sm:text-sm font-semibold text-[var(--color-text-main)] mb-1.5">
                      {{ i18n.t('contact.message_label')() }} <span class="text-rose-500">*</span>
                    </label>
                    <textarea rows="4"
                              [(ngModel)]="messageContent"
                              name="messageContent"
                              required
                              [placeholder]="i18n.t('contact.message_placeholder')()"
                              class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-from)] transition-colors resize-y"></textarea>
                  </div>

                  <!-- Submit Button -->
                  <div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div class="text-[11px] sm:text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>{{ i18n.t('contact.response_promise')() }} · {{ i18n.t('contact.global_support')() }}</span>
                    </div>

                    <button type="submit"
                            [disabled]="isSubmitting() || !isFormValid()"
                            class="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            style="background-image: linear-gradient(to right, var(--color-accent-from), var(--color-accent-to))">
                      @if (isSubmitting()) {
                        <span class="inline-flex items-center gap-2">
                          <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span>{{ i18n.t('contact.submitting')() }}</span>
                        </span>
                      } @else {
                        <span>{{ i18n.t('contact.submit_btn')() }}</span>
                      }
                    </button>
                  </div>
                </form>
              } @else {
                <!-- Success State Card -->
                <div class="py-8 text-center flex flex-col items-center">
                  <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mb-4 shadow-lg animate-bounce">
                    ✓
                  </div>
                  <h3 class="text-xl font-black text-[var(--color-text-main)] mb-2">
                    {{ i18n.t('contact.success_title')() }}
                  </h3>
                  <p class="max-w-md text-sm text-[var(--color-text-secondary)] leading-relaxed mb-6">
                    {{ i18n.t('contact.success_desc')() }}
                  </p>
                  <button type="button"
                          (click)="resetForm()"
                          class="px-5 py-2.5 rounded-xl bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-xs sm:text-sm font-semibold transition-colors cursor-pointer">
                    {{ i18n.t('contact.send_another')() }}
                  </button>
                </div>
              }

            </div>
          </div>
        }

      </div>

      </div>
    </div>
  `,
  styles: [`
    ::ng-deep .prose-invert {
      color: var(--color-text-secondary);
    }
    ::ng-deep .prose-invert h1, 
    ::ng-deep .prose-invert h2, 
    ::ng-deep .prose-invert h3 {
      color: var(--color-text-main);
      font-weight: 700;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    ::ng-deep .prose-invert ul {
      list-style-type: disc;
      padding-left: 1.5em;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }
    ::ng-deep .prose-invert p {
      margin-bottom: 1em;
    }
    ::ng-deep .prose-invert strong {
      color: var(--color-text-main);
    }
  `]
})
export class LegalComponent {
  private route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  private sanitizer = inject(DomSanitizer);
  private feedbackService = inject(FeedbackService);
  private toast = inject(ToastService);

  private paramsSig = toSignal(this.route.params);

  inquiryType = 'business';
  contactName = '';
  contactInfo = '';
  messageContent = '';

  isSubmitting = signal<boolean>(false);
  isSubmitted = signal<boolean>(false);

  inquiryTypes = [
    { value: 'business', labelKey: 'contact.type_business' },
    { value: 'suggestion', labelKey: 'contact.type_suggestion' },
    { value: 'bug', labelKey: 'contact.type_bug' },
    { value: 'other', labelKey: 'contact.type_other' }
  ];

  isContactPage = computed(() => {
    return (this.paramsSig()?.['type'] || '') === 'contact';
  });

  title = computed(() => {
    const type = this.paramsSig()?.['type'] || 'privacy';
    return this.i18n.t(`legal.${type}.title`)() || 'Legal Document';
  });

  content = computed(() => {
    const type = this.paramsSig()?.['type'] || 'privacy';
    return this.i18n.t(`legal.${type}.content`)() || 'Document content not found.';
  });

  contentHtml = signal<SafeHtml>('');

  constructor() {
    effect(() => {
      const raw = this.content();
      if (raw) {
         const html = marked.parse(raw) as string;
         const safeHtml = this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
         this.contentHtml.set(safeHtml);
      }
    });
  }

  isFormValid(): boolean {
    return !!(this.contactInfo.trim().length >= 3 && this.messageContent.trim().length >= 5);
  }

  submitContact() {
    if (!this.isFormValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const payload = {
      game_id: 'contact_page',
      level: this.contactName.trim() || undefined,
      type: this.inquiryType,
      contact: this.contactInfo.trim(),
      content: this.messageContent.trim()
    };

    this.feedbackService.submit(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSubmitted.set(true);
        this.toast.success(this.i18n.t('contact.success_title')() || 'Message sent!');
      },
      error: (err) => {
        console.error('Contact submit error:', err);
        this.isSubmitting.set(false);
        this.toast.error(this.i18n.t('feedback.submit_failed')() || 'Failed to submit. Please retry.');
      }
    });
  }

  resetForm() {
    this.contactName = '';
    this.contactInfo = '';
    this.messageContent = '';
    this.isSubmitted.set(false);
  }
}

