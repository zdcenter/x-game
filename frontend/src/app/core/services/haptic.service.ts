import { Injectable, signal } from '@angular/core';
import { storageGet, storageSet } from '../utils/browser.util';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

@Injectable({
  providedIn: 'root'
})
export class HapticService {
  isVibrationEnabled = signal<boolean>(true);

  constructor() {
    const saved = storageGet('xgame_vibration');
    if (saved === 'false') {
      this.isVibrationEnabled.set(false);
    }
  }

  toggleVibration() {
    const newVal = !this.isVibrationEnabled();
    this.isVibrationEnabled.set(newVal);
    storageSet('xgame_vibration', String(newVal));
    
    // Give immediate feedback when turning it on
    if (newVal) {
      this.vibrateLight();
    }
  }

  private triggerVibrate(pattern: number | number[]) {
    if (!this.isVibrationEnabled() || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibration failed', e);
    }
  }

  // --- Semantic Vibration Methods ---

  /** 
   * Very short vibration. Ideal for clicking buttons, selecting items, or making moves.
   */
  vibrateLight() {
    this.triggerVibrate(15);
  }

  /**
   * Moderate vibration. Ideal for placing blocks or merging.
   */
  vibrateMedium() {
    this.triggerVibrate(30);
  }

  /**
   * Heavy vibration. Ideal for dropping hard blocks, explosions, or large impacts.
   */
  vibrateHeavy() {
    this.triggerVibrate(50);
  }

  /**
   * Double pulse. Ideal for clearing lines, solving a puzzle, or winning.
   */
  vibrateSuccess() {
    this.triggerVibrate([30, 50, 30]);
  }

  /**
   * Crisp micro-vibration (10ms). Ideal for smooth swiping, sliding, or quick grid navigation.
   */
  vibrateSwipe() {
    this.triggerVibrate(10);
  }

  /**
   * Crisp tactile snap (20ms). Ideal for magnetic block drops, tile snaps, or merging.
   */
  vibrateSnap() {
    this.triggerVibrate(20);
  }

  /**
   * Rhythmic cascade pulse. Ideal for clearing lines, cascading combos, or chained matches.
   */
  vibrateCombo() {
    this.triggerVibrate([18, 30, 24]);
  }

  /**
   * Solid thud (45ms). Ideal for hard drop, heavy block impact, or boundary collision.
   */
  vibrateImpact() {
    this.triggerVibrate(45);
  }

  /**
   * Long strong vibration. Ideal for hitting a wall, making a mistake, or losing.
   */
  vibrateError() {
    this.triggerVibrate(100);
  }
}
