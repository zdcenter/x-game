import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmDialog {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);
  readonly currentConfirm = signal<ConfirmDialog | null>(null);
  
  private toastId = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = this.toastId++;
    this.toasts.update(t => [...t, { id, message, type }]);
    
    setTimeout(() => {
      this.removeToast(id);
    }, 3000);
  }
  
  removeToast(id: number) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  confirm(dialog: ConfirmDialog) {
    this.currentConfirm.set(dialog);
  }

  closeConfirm() {
    this.currentConfirm.set(null);
  }
}
