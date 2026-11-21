import { isBrowser, storageGet, storageSet } from './browser.util';

/**
 * Checks whether the interactive tutorial for a given game has already been completed or dismissed.
 * Returns true if the user has already gone through it or dismissed it, meaning do NOT auto-start.
 */
export function isTutorialCompleted(gameKey: string): boolean {
  if (!isBrowser()) return true;
  return (
    storageGet(`${gameKey}_tutorial_completed`) === 'true' ||
    storageGet(`${gameKey}_tutorial_dismissed`) === 'true'
  );
}

/**
 * Marks the tutorial as completed and dismissed so it will never auto-start on future visits.
 */
export function markTutorialCompleted(gameKey: string): void {
  if (!isBrowser()) return;
  storageSet(`${gameKey}_tutorial_completed`, 'true');
  storageSet(`${gameKey}_tutorial_dismissed`, 'true');
}
