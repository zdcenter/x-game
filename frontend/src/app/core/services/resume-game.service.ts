import { Injectable, inject } from '@angular/core';
import { isBrowser, storageGet, storageSet, storageRemove } from '../utils/browser.util';
import { I18nService } from '../i18n/i18n.service';

export interface SavedGameSession<T = any> {
  gameId: string;
  timestamp: number;
  difficulty?: string;
  difficultyLabel?: string;
  progressPercent: number; // 0 ~ 100
  timeElapsed: number; // in seconds
  score?: number;
  moves?: number;
  data: T;
  summaryText?: string;
}

const PREFIX = 'xgame_resume_session_';
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

@Injectable({
  providedIn: 'root'
})
export class ResumeGameService {
  private i18n = inject(I18nService);

  /**
   * Persists an in-progress game session locally in browser memory.
   * Completely client-side, zero server IO.
   */
  saveSession<T = any>(gameId: string, session: Omit<SavedGameSession<T>, 'gameId' | 'timestamp'>): void {
    if (!isBrowser() || !gameId) return;

    const fullSession: SavedGameSession<T> = {
      ...session,
      gameId,
      timestamp: Date.now()
    };

    try {
      storageSet(`${PREFIX}${gameId}`, JSON.stringify(fullSession));
    } catch (e) {
      console.warn(`[ResumeGameService] Failed to save session for ${gameId}:`, e);
    }
  }

  /**
   * Fast check if a valid session exists for a game.
   */
  hasValidSession(gameId: string): boolean {
    return !!this.loadSession(gameId);
  }

  /**
   * Reads the saved game session if exists and valid.
   */
  loadSession<T = any>(gameId: string): SavedGameSession<T> | null {
    if (!isBrowser() || !gameId) return null;

    const raw = storageGet(`${PREFIX}${gameId}`);
    if (!raw) return null;

    try {
      const session = JSON.parse(raw) as SavedGameSession<T>;
      if (!session || typeof session !== 'object') return null;

      // Discard expired sessions (> 14 days)
      if (Date.now() - session.timestamp > MAX_AGE_MS) {
        this.clearSession(gameId);
        return null;
      }

      // Check if session has substantive progress
      if (!this.hasSubstantiveProgress(session)) {
        this.clearSession(gameId);
        return null;
      }

      return session;
    } catch {
      this.clearSession(gameId);
      return null;
    }
  }

  /**
   * Removes saved session for a game.
   */
  clearSession(gameId: string): void {
    if (!isBrowser() || !gameId) return;
    storageRemove(`${PREFIX}${gameId}`);
  }

  /**
   * Checks if an in-progress game has substantial progress worth resuming.
   */
  hasSubstantiveProgress(session: SavedGameSession): boolean {
    if (!session) return false;
    if (session.progressPercent && session.progressPercent >= 2) return true;
    if (session.moves && session.moves >= 1) return true;
    if (session.score && session.score > 0) return true;
    if (session.timeElapsed && session.timeElapsed >= 5) return true;
    return false;
  }

  /**
   * Human-readable relative time (e.g. Just now, 5m ago, 2h ago).
   */
  formatTimeAgo(timestamp: number): string {
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 60) {
      return this.i18n.t('resume.saved_just_now')() || '刚刚';
    }
    const diffMins = Math.floor(diffSec / 60);
    if (diffMins < 60) {
      return (this.i18n.t('resume.saved_mins_ago')() || '{mins}分钟前').replace('{mins}', String(diffMins));
    }
    const diffHours = Math.floor(diffMins / 60);
    return (this.i18n.t('resume.saved_hours_ago')() || '{hours}小时前').replace('{hours}', String(diffHours));
  }

  /**
   * Format seconds to mm:ss or hh:mm:ss
   */
  formatTime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins < 60) {
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${String(hrs).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Universal localized difficulty label resolver.
   */
  getDifficultyLabel(difficulty?: string, gameId?: string): string {
    if (!difficulty) return '';
    const d = difficulty.toLowerCase().trim();

    const candidateKeys: string[] = [];
    if (gameId) {
      candidateKeys.push(`${gameId}.difficulty.${d}`);
      candidateKeys.push(`game.diff_${gameId}_${d}`);
    }
    candidateKeys.push(`difficulty.${d}`);
    candidateKeys.push(`game.diff_${d}`);
    candidateKeys.push(`game.difficulty_${d}`);

    for (const key of candidateKeys) {
      if (this.i18n.hasKey(key)) {
        const val = this.i18n.t(key)();
        if (val && val !== key) return val;
      }
    }

    // Fallback: capitalize first letter
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }
}
