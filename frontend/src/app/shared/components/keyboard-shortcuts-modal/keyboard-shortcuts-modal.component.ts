import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/i18n/i18n.service';
import { KeyboardShortcutService } from '../../../core/services/keyboard-shortcut.service';

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (shortcutService.isModalOpen()) {
      <div class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
           (click)="shortcutService.closeModal()">
        
        <div class="w-full max-w-lg bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-3xl p-6 shadow-2xl animate-scale-in"
             (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-4 border-b border-[var(--color-border-card)]">
            <div class="flex items-center gap-2.5">
              <span class="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center text-lg">
                ⌨️
              </span>
              <div>
                <h3 class="font-black text-base sm:text-lg text-[var(--color-text-main)]">
                  {{ i18n.t('shortcuts.title')() || '桌面端全局快捷键' }}
                </h3>
                <p class="text-[11px] text-[var(--color-text-muted)]">
                  {{ i18n.t('shortcuts.subtitle')() || '按键即发，畅享沉浸式硬核解谜' }}
                </p>
              </div>
            </div>

            <button (click)="shortcutService.closeModal()"
                    class="w-8 h-8 rounded-xl bg-[var(--color-bg-main)] hover:bg-[var(--color-border-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center justify-center transition-all cursor-pointer">
              ✕
            </button>
          </div>

          <!-- Shortcuts Matrix -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-4">
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
          <div class="pt-3 border-t border-[var(--color-border-card)]">
            <button (click)="shortcutService.closeModal()"
                    class="w-full py-2.5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer">
              {{ i18n.t('common.got_it')() || '我知道了' }}
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class KeyboardShortcutsModalComponent {
  i18n = inject(I18nService);
  shortcutService = inject(KeyboardShortcutService);
}
