import { Injectable, signal, inject } from '@angular/core';
import { isBrowser } from '../utils/browser.util';
import { HapticService } from './haptic.service';
import { AudioService } from './audio.service';

export interface FloatingJuiceText {
  id: number;
  text: string;
  icon: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class JuiceService {
  private haptic = inject(HapticService);
  private audio = inject(AudioService);

  readonly isShaking = signal<boolean>(false);
  readonly floatingTexts = signal<FloatingJuiceText[]>([]);
  private nextId = 1;

  /**
   * Triggers a juicy screen shake with tactile micro-vibration.
   */
  shakeScreen(): void {
    if (!isBrowser()) return;
    this.isShaking.set(false);
    setTimeout(() => {
      this.isShaking.set(true);
      this.haptic.vibrateMedium();
      setTimeout(() => this.isShaking.set(false), 200);
    }, 10);
  }

  /**
   * Spawns an arcade-style floating combo / critical text.
   */
  popText(text: string, icon: string = '🔥'): void {
    const item: FloatingJuiceText = {
      id: this.nextId++,
      text,
      icon,
      timestamp: Date.now()
    };

    this.floatingTexts.update(list => [...list, item]);
    this.shakeScreen();

    // Auto cleanup after 1.4s
    setTimeout(() => {
      this.floatingTexts.update(list => list.filter(t => t.id !== item.id));
    }, 1400);
  }

  /**
   * Full critical combo blast (Shake + Sound + Text)
   */
  triggerCombo(comboCount: number): void {
    if (comboCount <= 1) return;
    const label = comboCount >= 5 ? `UNSTOPPABLE x${comboCount}!` : (comboCount >= 3 ? `MEGA COMBO x${comboCount}!` : `COMBO x${comboCount}`);
    const icon = comboCount >= 5 ? '⚡' : '🔥';
    this.popText(label, icon);
  }
}

