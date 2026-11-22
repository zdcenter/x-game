import { Injectable, signal, inject } from '@angular/core';
import { isBrowser } from '../utils/browser.util';
import { AudioService } from './audio.service';

export type ShortcutAction = 'restart' | 'undo' | 'hint' | 'pause' | 'next' | 'swap';

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutService {
  private audio = inject(AudioService);

  readonly isModalOpen = signal<boolean>(false);

  openModal(): void {
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  toggleModal(): void {
    this.isModalOpen.update(v => !v);
  }

  /**
   * Dispatches a game action to the currently active game.
   */
  dispatchAction(action: ShortcutAction): void {
    if (!isBrowser()) return;
    window.dispatchEvent(new CustomEvent('xgame:shortcut', { detail: { action } }));
  }

  /**
   * Helper to check if user is currently typing in an input/textarea.
   */
  isTyping(target: EventTarget | null): boolean {
    if (!target || !(target as HTMLElement).tagName) return false;
    const tag = (target as HTMLElement).tagName.toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || (target as HTMLElement).isContentEditable;
  }
}
