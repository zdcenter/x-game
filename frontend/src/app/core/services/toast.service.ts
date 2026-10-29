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
  confirmStyle?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface GameInviteBanner {
  senderName: string;
  gameTitle: string;
  room: any;
  onAccept: () => void;
  onDismiss: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);
  readonly currentConfirm = signal<ConfirmDialog | null>(null);
  readonly activeInvite = signal<GameInviteBanner | null>(null);
  
  private toastId = 0;
  private inviteTimer?: any;

  showInvite(invite: GameInviteBanner) {
    if (this.inviteTimer) clearTimeout(this.inviteTimer);
    this.activeInvite.set(invite);
    // Auto-dismiss after 12s so it never blocks the screen
    this.inviteTimer = setTimeout(() => {
      this.dismissInvite();
    }, 12000);
  }

  dismissInvite() {
    if (this.inviteTimer) {
      clearTimeout(this.inviteTimer);
      this.inviteTimer = undefined;
    }
    const curr = this.activeInvite();
    if (!curr) return;
    this.activeInvite.set(null);
    try {
      curr.onDismiss?.();
    } catch (e) {
      console.error('Error in invite onDismiss callback:', e);
    }
  }

  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = this.toastId++;
    this.toasts.update(t => [...t, { id, message, type }]);
    
    setTimeout(() => {
      this.removeToast(id);
    }, 3000);
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string) { this.show(message, 'error'); }
  info(message: string) { this.show(message, 'info'); }
  warning(message: string) { this.show(message, 'info'); }
  
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
