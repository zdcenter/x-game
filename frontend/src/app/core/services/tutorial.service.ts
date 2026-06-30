import { Injectable } from '@angular/core';
import { storageGet, storageSet } from '../utils/browser.util';
import { GAME_DEFINITIONS, TutorialStep } from '../config/game-definitions';

export type { TutorialStep };

@Injectable({ providedIn: 'root' })
export class TutorialService {
  getStepsForGame(gameId: string): TutorialStep[] {
    return GAME_DEFINITIONS.find(g => g.id === gameId)?.tutorial ?? [];
  }

  hasSeen(gameId: string): boolean {
    return true; // Disabled globally as game instructions are already clear
  }

  markSeen(gameId: string): void {
    storageSet(`seen_tutorial_${gameId}`, '1');
  }

  resetAll(): void {
    GAME_DEFINITIONS.forEach(g => {
      try { localStorage.removeItem(`seen_tutorial_${g.id}`); } catch {}
    });
  }
}
