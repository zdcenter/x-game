import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { isBrowser } from '../../../core/utils/browser.util';
import { BaseModalComponent } from '../base-modal/base-modal.component';

export type FeedbackType = 'bug' | 'suggestion' | 'wrong_answer' | 'other';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModalComponent],
  template: `
    <app-base-modal
      [isOpen]="feedbackService.isOpen()"
      [title]="i18n.t('feedback.title')() || '意见建议与 Bug 反馈'"
      [subtitle]="i18n.t('feedback.subtitle')() || '遇到问题或有好点子？告诉我们，我们会尽快优化！'"
      icon="🐞"
      maxWidth="md"
      (closed)="close()">

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
                  class="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer">
            {{ i18n.t('common.confirm')() || '好的' }}
          </button>
        </div>
      } @else {
        <!-- Body Form -->
        <div class="space-y-3.5 pr-1">
          
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
            </div>
          }

          <!-- Feedback Type Selector -->
          <div>
            <label class="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5">
              {{ i18n.t('feedback.type_label')() || '反馈类型' }}
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              @for (type of feedbackTypes; track type.value) {
                <button type="button" 
                        (click)="selectedType.set(type.value)"
                        class="p-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer"
                        [class.bg-[var(--color-accent-from)]]="selectedType() === type.value"
                        [class.text-white]="selectedType() === type.value"
                        [class.border-transparent]="selectedType() === type.value"
                        [class.shadow-xs]="selectedType() === type.value"
                        [class.bg-[var(--color-bg-main)]]="selectedType() !== type.value"
                        [class.text-[var(--color-text-secondary)]]="selectedType() !== type.value"
                        [class.border-[var(--color-border-card)]]="selectedType() !== type.value">
                  <span class="text-base">{{ type.icon }}</span>
                  <span class="text-[11px]">{{ type.label() }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Content Textarea -->
          <div>
            <label class="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 flex justify-between">
              <span>{{ i18n.t('feedback.content_label')() || '详细描述' }}</span>
              <span class="text-[10px] text-[var(--color-text-muted)] font-normal font-mono">{{ content.length }}/500</span>
            </label>
            <textarea [(ngModel)]="content" 
                      maxlength="500" 
                      rows="3"
                      class="w-full p-3 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-from)] focus:ring-1 focus:ring-[var(--color-accent-from)] transition-all resize-none"
                      [placeholder]="currentPlaceholder()"></textarea>
          </div>

          <!-- Contact (Optional) -->
          <div>
            <label class="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5 flex justify-between">
              <span>{{ i18n.t('feedback.contact_label')() || '联系方式 (选填)' }}</span>
              <span class="text-[10px] text-[var(--color-text-muted)] font-normal">{{ i18n.t('feedback.contact_hint')() || '邮箱 / 微信 / QQ' }}</span>
            </label>
            <input type="text" 
                   [(ngModel)]="contact" 
                   maxlength="100"
                   class="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-main)] border border-[var(--color-border-card)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent-from)] transition-all"
                   [placeholder]="i18n.t('feedback.contact_placeholder')() || '方便我们向您答复处理进展'" />
          </div>

          <!-- Error Alert -->
          @if (errorMessage()) {
            <div class="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-1.5 animate-shake">
              <span>⚠️</span>
              <span>{{ errorMessage() }}</span>
            </div>
          }
        </div>
      }

      <!-- Modal Footer Action -->
      @if (!isSuccess()) {
        <div modal-footer class="flex items-center justify-end gap-2">
          <button type="button" 
                  (click)="close()" 
                  class="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-border-card)]/40 transition-colors cursor-pointer">
            {{ i18n.t('common.cancel')() || '取消' }}
          </button>
          <button type="button" 
                  (click)="submit()" 
                  [disabled]="isSubmitting() || content.trim().length < 3"
                  class="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[var(--color-accent-from)] to-[var(--color-accent-to)] text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
            @if (isSubmitting()) {
              <span class="animate-spin text-xs">⏳</span>
              <span>{{ i18n.t('feedback.submitting')() || '正在提交...' }}</span>
            } @else {
              <span>🚀</span>
              <span>{{ i18n.t('feedback.submit')() || '发送反馈' }}</span>
            }
          </button>
        </div>
      }
    </app-base-modal>
  `
})
export class FeedbackModalComponent {
  feedbackService = inject(FeedbackService);
  i18n = inject(I18nService);

  content = '';
  contact = '';
  selectedType = signal<FeedbackType>('bug');
  isSubmitting = signal(false);
  isSuccess = signal(false);
  errorMessage = signal('');

  detectedContext = computed(() => this.feedbackService.activeContext());

  feedbackTypes = [
    { value: 'bug' as FeedbackType, icon: '🐛', label: () => this.i18n.t('feedback.type_bug')() || 'Bug 故障' },
    { value: 'suggestion' as FeedbackType, icon: '💡', label: () => this.i18n.t('feedback.type_suggestion')() || '体验建议' },
    { value: 'wrong_answer' as FeedbackType, icon: '❓', label: () => this.i18n.t('feedback.type_wrong_answer')() || '题目有误' },
    { value: 'other' as FeedbackType, icon: '💬', label: () => this.i18n.t('feedback.type_other')() || '其它' }
  ];

  currentPlaceholder = computed(() => {
    switch (this.selectedType()) {
      case 'bug':
        return this.i18n.t('feedback.placeholder_bug')() || '请描述具体遇到的异常现象、操作步骤或浏览器表现...';
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
