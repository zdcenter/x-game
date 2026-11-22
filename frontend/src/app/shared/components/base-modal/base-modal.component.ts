import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-fade-in"
           style="overscroll-behavior: contain;">
        <!-- Backdrop with Blur -->
        <div class="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity"
             (click)="handleBackdropClick()"></div>

        <!-- Dialog Box -->
        <div class="relative bg-[var(--color-bg-card)] border border-[var(--color-border-card)] rounded-3xl shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-up z-10 text-[var(--color-text-main)]"
             [ngClass]="maxWidthClass"
             (click)="$event.stopPropagation()">

          <!-- Header (Slot or Default) -->
          @if (showHeader) {
            <div class="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--color-border-card)] bg-[var(--color-bg-main)]/60 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                @if (icon) {
                  <span class="text-xl sm:text-2xl shrink-0 leading-none">{{ icon }}</span>
                }
                <div class="min-w-0">
                  @if (title) {
                    <h3 class="text-sm sm:text-base font-black tracking-tight text-[var(--color-text-main)] truncate">
                      {{ title }}
                    </h3>
                  }
                  @if (subtitle) {
                    <p class="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">
                      {{ subtitle }}
                    </p>
                  }
                  <ng-content select="[modal-title]"></ng-content>
                </div>
              </div>

              @if (showClose) {
                <button type="button"
                        (click)="close()"
                        class="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-bg-card)] hover:bg-[var(--color-border-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] active:scale-95 transition-all cursor-pointer border border-[var(--color-border-card)] text-xs font-bold shrink-0"
                        aria-label="Close modal">
                  ✕
                </button>
              }
            </div>
          }

          <!-- Body Slot (Scrollable) -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 min-h-0"
               [ngClass]="bodyClass">
            <ng-content></ng-content>
          </div>

          <!-- Footer Slot (Optional) -->
          <div class="empty:hidden px-4 sm:px-6 py-3 border-t border-[var(--color-border-card)] bg-[var(--color-bg-main)]/40 shrink-0">
            <ng-content select="[modal-footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `
})
export class BaseModalComponent {
  @Input() isOpen = false;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() maxWidth: ModalMaxWidth = 'md';
  @Input() showHeader = true;
  @Input() showClose = true;
  @Input() closeOnBackdrop = true;
  @Input() bodyClass = '';

  @Output() closed = new EventEmitter<void>();

  get maxWidthClass(): string {
    switch (this.maxWidth) {
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      case '2xl': return 'max-w-2xl';
      case '3xl': return 'max-w-3xl';
      default: return 'max-w-md';
    }
  }

  close(): void {
    this.closed.emit();
  }

  handleBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }
}
