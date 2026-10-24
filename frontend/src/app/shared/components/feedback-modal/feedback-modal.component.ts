import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { isBrowser } from '../../../core/utils/browser.util';

export type FeedbackType = 'bug' | 'suggestion' | 'wrong_answer' | 'other';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
@if (feedbackService.isOpen()) {
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
       style="overscroll-behavior: contain;">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="close()"></div>

    <!-- Modal Dialog -->
    <div class="relative w-full max-w-[480px] bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 overflow-hidden z-10 flex flex-col max-h-[90dvh]">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-[var(--color-border-card)]">
        <div class="flex items-center gap-2">
          <span class="text-xl sm:text-2xl">🐞</span>
          <div>
            <h3 class="text-base sm:text-lg font-bold text-[var(--color-text-main)]">
              {{ i18n.t('feedback.title')() || '意见建议与 Bug 反馈' }}
            </h3>
            <p class="text-[11px] text-[var(--color-text-muted)]">
              {{ i18n.t('feedback.subtitle')() || '遇到问题或有好点子？告诉我们，我们会尽快优化！' }}
            </p>
          </div>
        </div>
        <button (click)="close()" 
                class="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-main)] transition-colors active:scale-95"
                [attr.aria-label]="i18n.t('common.close')() || 'Close'">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Success State -->
      @if (isSuccess()) {
        <div class="py-8 flex flex-col items-center text-center animate-fade-in">
          <div class="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center text-2xl mb-3 shadow-inner">
            ✓
          </div>
          <h4 class="text-base font-bold text-[var(--color-text-main)] mb-1">
            {{ i18n.t('feedback.success_title')() || '反馈提交成功！' }}
          </h4>
          <p class="text-xs text-[var(--color-text-secondary)] max-w-xs mb-5">
            {{ i18n.t('feedback.success_desc')() || '非常感谢您对益智游戏PK网的支持与帮助，我们会认真阅读并尽快处理！' }}
          </p>
          <button (click)="close()" 
                  class="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all">
            {{ i18n.t('common.confirm')() || '好的' }}
          </button>
        </div>
      } @else {
        <!-- Body Form -->
        <div class="flex-grow overflow-y-auto pt-3.5 space-y-3.5 pr-1" style="-webkit-overflow-scrolling: touch;">
          
          <!-- Auto-detected Context Badges -->
          @if (detectedContext()) {
            <div class="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[11px]">
              <span class="text-[var(--color-text-muted)] font-medium">📍 {{ i18n.t('feedback.context')() || '当前环境' }}:</span>
              @if (detectedContext()?.gameTitle) {
                <span class="px-2 py-0.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-card)] font-bold text-[var(--color-text-main)]">
                  🎮 {{ detectedContext()?.gameTitle }}
                </span>
              }
              @if (detectedContext()?.level) {
                <span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                  🎯 {{ detectedContext()?.level }}
                </span>
              }
              <span class="px-2 py-0.5 rounded-md bg-[var(--color-bg-card)] border border-[var(--color-border-card)] text-[var(--color-text-muted)] font-mono text-[10px]">
                📱 {{ deviceSummary() }}
              </span>
            </div>
          }

          <!-- Feedback Type Selector -->
          <div>
            <label class="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5">
              {{ i18n.t('feedback.type_label')() || '反馈类型' }} <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              @for (tab of types; track tab.id) {
                <button type="button"
                        (click)="selectedType.set(tab.id)"
                        class="px-2 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 text-center"
                        [ngClass]="selectedType() === tab.id
                          ? 'bg-[var(--color-accent-from)]/15 border-[var(--color-accent-from)] text-[var(--color-accent-from)] shadow-sm'
                          : 'bg-[var(--color-bg-main)] border-[var(--color-border-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)]'">
                  <span>{{ tab.icon }}</span>
                  <span class="truncate">{{ tab.label() }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Content Description -->
          <div>
            <label class="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5">
              {{ i18n.t('feedback.content_label')() || '问题与建议说明' }} <span class="text-red-500">*</span>
            </label>
            <textarea [(ngModel)]="content"
                      rows="4"
                      maxlength="1500"
                      class="w-full px-3 py-2.5 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] text-xs focus:outline-none focus:border-[var(--color-accent-from)] transition-colors resize-none"
                      [placeholder]="contentPlaceholder()"></textarea>
            <div class="flex justify-between items-center text-[10px] text-[var(--color-text-muted)] mt-1 px-1">
              <span>{{ i18n.t('feedback.min_chars_hint')() || '至少输入 3 个字' }}</span>
              <span>{{ content.length }} / 1500</span>
            </div>
          </div>

          <!-- Contact Info (Optional) -->
          <div>
            <label class="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5">
              {{ i18n.t('feedback.contact_label')() || '联系方式 (选填)' }}
            </label>
            <input type="text"
                   [(ngModel)]="contact"
                   maxlength="100"
                   class="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] text-xs focus:outline-none focus:border-[var(--color-accent-from)] transition-colors"
                   [placeholder]="i18n.t('feedback.contact_placeholder')() || '微信 / QQ / 邮箱 (方便核实或发放采纳奖励)'">
            <p class="text-[10px] text-[var(--color-text-muted)] mt-1 px-1">
              {{ i18n.t('feedback.reward_tip')() || '🎁 采纳有价值的 Bug 修复或玩法建议，将奖励 50~100 脑力币！' }}
            </p>
          </div>

          @if (errorMessage()) {
            <div class="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs animate-shake">
              {{ errorMessage() }}
            </div>
          }
        </div>

        <!-- Footer Actions -->
        <div class="pt-3 border-t border-[var(--color-border-card)] flex items-center justify-end gap-2 mt-2">
          <button type="button"
                  (click)="close()"
                  class="px-4 py-2 rounded-xl border border-[var(--color-border-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-main)] text-xs font-bold transition-all active:scale-95">
            {{ i18n.t('common.cancel')() || '取消' }}
          </button>
          <button type="button"
                  (click)="submit()"
                  [disabled]="isSubmitting() || content.trim().length < 3"
                  class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
            @if (isSubmitting()) {
              <svg class="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ i18n.t('feedback.submitting')() || '正在提交...' }}</span>
            } @else {
              <span>🚀</span>
              <span>{{ i18n.t('feedback.submit')() || '提交反馈' }}</span>
            }
          </button>
        </div>
      }

    </div>
  </div>
}
  `
})
export class FeedbackModalComponent {
  feedbackService = inject(FeedbackService);
  i18n = inject(I18nService);

  selectedType = signal<FeedbackType>('bug');
  content = '';
  contact = '';
  isSubmitting = signal(false);
  isSuccess = signal(false);
  errorMessage = signal('');

  detectedContext = computed(() => this.feedbackService.activeContext());

  types = [
    { id: 'bug' as FeedbackType, icon: '🐛', label: () => this.i18n.t('feedback.type_bug')() || '游戏Bug' },
    { id: 'suggestion' as FeedbackType, icon: '💡', label: () => this.i18n.t('feedback.type_suggestion')() || '体验建议' },
    { id: 'wrong_answer' as FeedbackType, icon: '⚠️', label: () => this.i18n.t('feedback.type_wrong_answer')() || '题目有误' },
    { id: 'other' as FeedbackType, icon: '💬', label: () => this.i18n.t('feedback.type_other')() || '其它' }
  ];

  contentPlaceholder = computed(() => {
    switch (this.selectedType()) {
      case 'bug':
        return this.i18n.t('feedback.placeholder_bug')() || '请描述具体在哪一步卡住或出现异常，如有复现步骤更好...';
      case 'wrong_answer':
        return this.i18n.t('feedback.placeholder_wrong')() || '请指明题目哪里的答案有冲突或不可解，感谢协助纠错！';
      case 'suggestion':
        return this.i18n.t('feedback.placeholder_suggestion')() || '您希望增加什么玩法、音效或操作方式？期待您的金点子！';
      default:
        return this.i18n.t('feedback.placeholder_default')() || '请写下您的意见或反馈...';
    }
  });

  deviceSummary = computed(() => {
    if (!isBrowser()) return 'SSR';
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    return `${w}x${h} ${isPWA ? 'PWA' : (isTouch ? 'Touch' : 'Desktop')}`;
  });

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.feedbackService.isOpen()) {
      this.close();
    }
  }

  close() {
    this.feedbackService.close();
    this.resetForm();
  }

  private resetForm() {
    this.content = '';
    this.contact = '';
    this.isSubmitting.set(false);
    this.isSuccess.set(false);
    this.errorMessage.set('');
    this.selectedType.set('bug');
  }

  submit() {
    if (this.content.trim().length < 3) {
      this.errorMessage.set(this.i18n.t('feedback.content_too_short')() || '内容太短，请至少输入 3 个字');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const ctx = this.detectedContext();
    const payload = {
      game_id: ctx?.gameId || '',
      level: ctx?.level || '',
      type: this.selectedType(),
      content: this.content.trim(),
      device_info: isBrowser() ? `${this.deviceSummary()} | UA: ${navigator.userAgent}` : '',
      contact: this.contact.trim()
    };

    this.feedbackService.submit(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.error || this.i18n.t('feedback.submit_failed')() || '提交失败，请重试');
      }
    });
  }
}
