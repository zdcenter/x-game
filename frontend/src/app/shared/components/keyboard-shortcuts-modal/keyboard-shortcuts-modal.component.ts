import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { KeyboardShortcutService } from '../../../core/services/keyboard-shortcut.service';
import { BaseModalComponent } from '../base-modal/base-modal.component';

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  standalone: true,
  imports: [CommonModule, BaseModalComponent],
  template: `
    <app-base-modal
      [isOpen]="shortcutService.isModalOpen()"
      [title]="i18n.t('shortcuts.title')() || '桌面端全局快捷键'"
      [subtitle]="i18n.t('shortcuts.subtitle')() || '按键即发，畅享沉浸式硬核解谜'"
      icon="⌨️"
      maxWidth="lg"
      (closed)="shortcutService.closeModal()">

      <!-- Shortcuts Matrix -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <!-- R: Restart -->
        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)]">
          <span class="text-xs font-bold text-[var(--color-text-main)]">
            {{ i18n.t('shortcuts.restart')() || '重新开始' }}
          </span>
          <kbd class="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs font-mono font-black text-xs text-amber-500">
            R
          </kbd>
        </div>

        <!-- Z: Undo -->
        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)]">
          <span class="text-xs font-bold text-[var(--color-text-main)]">
            {{ i18n.t('shortcuts.undo')() || '撤销一步' }}
          </span>
          <kbd class="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs font-mono font-black text-xs text-sky-400">
            Z / Ctrl+Z
          </kbd>
        </div>

        <!-- H: Hint -->
        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)]">
          <span class="text-xs font-bold text-[var(--color-text-main)]">
            {{ i18n.t('shortcuts.hint')() || '解题提示' }}
          </span>
          <kbd class="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs font-mono font-black text-xs text-emerald-400">
            H
          </kbd>
        </div>

        <!-- Space: Next / Rematch / Pause -->
        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)]">
          <span class="text-xs font-bold text-[var(--color-text-main)]">
            {{ i18n.t('shortcuts.space')() || '下一关 / 确认 / 暂停' }}
          </span>
          <kbd class="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs font-mono font-black text-xs text-purple-400">
            Space / ↵
          </kbd>
        </div>

        <!-- M: Toggle Mute -->
        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)]">
          <span class="text-xs font-bold text-[var(--color-text-main)]">
            {{ i18n.t('shortcuts.mute')() || '静音 / 开启音效' }}
          </span>
          <kbd class="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs font-mono font-black text-xs text-rose-400">
            M
          </kbd>
        </div>

        <!-- F: Fullscreen -->
        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)]">
          <span class="text-xs font-bold text-[var(--color-text-main)]">
            {{ i18n.t('shortcuts.fullscreen')() || '全屏模式切换' }}
          </span>
          <kbd class="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs font-mono font-black text-xs text-indigo-400">
            F
          </kbd>
        </div>

        <!-- Esc: Close / Back -->
        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)]">
          <span class="text-xs font-bold text-[var(--color-text-main)]">
            {{ i18n.t('shortcuts.escape')() || '关闭弹窗 / 返回' }}
          </span>
          <kbd class="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs font-mono font-black text-xs text-slate-400">
            Esc
          </kbd>
        </div>

        <!-- ?: Help -->
        <div class="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-bg-main)]/80 border border-[var(--color-border-card)]">
          <span class="text-xs font-bold text-[var(--color-text-main)]">
            {{ i18n.t('shortcuts.help')() || '随时查看本手册' }}
          </span>
          <kbd class="px-2 py-1 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] shadow-xs font-mono font-black text-xs text-teal-400">
            ? (Shift+/)
          </kbd>
        </div>
      </div>

      <!-- Footer Button -->
      <div modal-footer>
        <button (click)="shortcutService.closeModal()"
                class="w-full py-2.5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer">
          {{ i18n.t('common.got_it')() || '我知道了' }}
        </button>
      </div>
    </app-base-modal>
  `
})
export class KeyboardShortcutsModalComponent {
  i18n = inject(I18nService);
  shortcutService = inject(KeyboardShortcutService);
}
