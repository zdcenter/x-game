import { Injectable, signal } from '@angular/core';

export interface AuthModalOptions {
  title?: string;
  subtitle?: string;
  returnUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthModalService {
  isOpen = signal<boolean>(false);
  title = signal<string>('');
  subtitle = signal<string>('');
  returnUrl = signal<string>('');

  open(options?: AuthModalOptions) {
    this.title.set(options?.title || '');
    this.subtitle.set(options?.subtitle || '');
    this.returnUrl.set(options?.returnUrl || '');
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }
}
