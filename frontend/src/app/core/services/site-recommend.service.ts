import { Injectable, inject, signal, computed } from '@angular/core';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';
import { AuthStore } from '../auth/auth.store';
import { getOrigin } from '../utils/browser.util';

export interface RecommendScript {
  id: 'casual' | 'pk' | 'family' | 'minimal';
  icon: string;
  tabKey: string;
  titleKey: string;
  templateKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class SiteRecommendService {
  private toast: ToastService | null = null;
  private i18n: I18nService | null = null;
  private authStore: AuthStore | null = null;

  // 弹窗开关状态
  readonly isOpen = signal(false);

  // 当前选中的话术类型
  readonly activeScriptId = signal<'casual' | 'pk' | 'family' | 'minimal'>('casual');

  constructor() {
    try {
      this.toast = inject(ToastService, { optional: true });
      this.i18n = inject(I18nService, { optional: true });
      this.authStore = inject(AuthStore, { optional: true });
    } catch {
      // Allow clean instantiation in non-DI unit tests
    }
  }

  // 纯净官方分享链接（不带推销返利参数，令人放心）
  readonly inviteUrl = computed(() => {
    const origin = getOrigin() || 'https://www.puzzlepk.com';
    const lang = this.i18n?.currentLang ? this.i18n.currentLang() : 'zh';
    return `${origin}/${lang}`;
  });

  // 默认推荐标识（保留纯净回退）
  readonly referralCode = computed(() => 'PUZZLEPK');

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  async copyText(text: string, successTip?: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.body.removeChild(textarea);
      }
      const defaultTip = this.i18n?.t ? this.i18n.t('recommend.copied_tip')() : '✨ 已复制到剪贴板，快发给好友吧！';
      this.toast?.success(successTip || defaultTip);
    } catch {
      this.toast?.error('复制失败，请手动选择复制');
    }
  }
}
