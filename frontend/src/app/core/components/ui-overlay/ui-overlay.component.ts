import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
@Component({
  selector: 'app-ui-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Toasts -->
    <div class="fixed top-20 right-4 z-[9999] flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="px-4 py-3 rounded-lg shadow-lg text-sm font-bold text-white transition-all transform animate-slide-in"
             [class.bg-emerald-500]="toast.type === 'success'"
             [class.bg-red-500]="toast.type === 'error'"
             [class.bg-blue-500]="toast.type === 'info'">
          {{ toast.message }}
        </div>
      }
    </div>

    <!-- Confirm Dialog -->
    @if (toastService.currentConfirm(); as dialog) {
      <div class="fixed inset-0 z-[9999] bg-[var(--color-overlay)] backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform animate-scale-in text-[var(--color-text-main)]">
          <div class="p-6">
            <h3 class="text-lg font-bold mb-2">{{ dialog.title }}</h3>
            <p class="opacity-70 text-sm leading-relaxed mb-6">{{ dialog.message }}</p>
            <div class="flex gap-3">
              <button (click)="cancelConfirm(dialog)" class="flex-1 py-2.5 rounded-xl font-bold bg-[var(--color-bg-card)] opacity-80 hover:opacity-100 border border-[var(--color-border-card)] transition-colors">
                {{ dialog.cancelText || 'Cancel' }}
              </button>
              <button (click)="acceptConfirm(dialog)" 
                      class="flex-1 py-2.5 rounded-xl font-bold transition-colors shadow-lg"
                      [class.bg-red-500]="dialog.confirmStyle !== 'primary'"
                      [class.text-white]="dialog.confirmStyle !== 'primary'"
                      [class.hover:bg-red-400]="dialog.confirmStyle !== 'primary'"
                      [class.shadow-red-500/20]="dialog.confirmStyle !== 'primary'"
                      [class.bg-blue-500]="dialog.confirmStyle === 'primary'"
                      [class.text-white]="dialog.confirmStyle === 'primary'"
                      [class.hover:bg-blue-400]="dialog.confirmStyle === 'primary'"
                      [class.shadow-blue-500/20]="dialog.confirmStyle === 'primary'">
                {{ dialog.confirmText || 'Confirm' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in { animation: slide-in 0.2s ease-out forwards; }
    
    @keyframes scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
  `]
})
export class UiOverlayComponent {
  toastService = inject(ToastService);

  acceptConfirm(dialog: any) {
    dialog.onConfirm();
    this.toastService.closeConfirm();
  }

  cancelConfirm(dialog: any) {
    if (dialog.onCancel) {
      dialog.onCancel();
    }
    this.toastService.closeConfirm();
  }
}
