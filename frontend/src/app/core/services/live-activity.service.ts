import { Injectable, inject, signal, computed } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../i18n/i18n.service';
import { LobbyActivity } from '../models/activity.model';

@Injectable({
  providedIn: 'root'
})
export class LiveActivityService {
  private ws = inject(WebSocketService);
  private auth = inject(AuthStore);
  private i18n = inject(I18nService);

  private lastReportedTime = new Map<string, number>();

  /** All activities from WebSocket (real-time + server cache) */
  readonly activities = computed(() => this.ws.lobbyActivities());

  /** Whether any activity is available */
  readonly hasActivities = computed(() => this.activities().length > 0);

  /**
   * Report that the player started playing a single player game (debounced)
   */
  reportPlaying(gameId: string, diff?: string, mode: string = 'single'): void {
    if (!gameId) return;

    // Debounce to max 1 report per 45s per game
    const now = Date.now();
    const last = this.lastReportedTime.get(gameId) || 0;
    if (now - last < 45000) return;
    this.lastReportedTime.set(gameId, now);

    const user = this.auth.currentUser();
    const username = user?.username || this.auth.guestId;
    const avatar = user?.avatar || '';

    this.ws.sendLobbyAction('report_activity', {
      activityType: 'playing',
      gameId,
      diff: diff || '',
      mode: mode || 'single',
      avatar,
      username,
    });
  }

  /**
   * Report high score or level completion milestone
   */
  reportRecord(gameId: string, score: number, timeTaken?: number, diff?: string): void {
    if (!gameId) return;

    const user = this.auth.currentUser();
    const username = user?.username || this.auth.guestId;
    const avatar = user?.avatar || '';

    this.ws.sendLobbyAction('report_activity', {
      activityType: 'record',
      gameId,
      score: score || 0,
      timeTaken: timeTaken || 0,
      diff: diff || '',
      avatar,
      username,
    });
  }

  /**
   * Report game victory or defeat result to the global live activity feed
   */
  reportGameResult(
    gameId: string,
    won: boolean,
    mode: string = 'single',
    diff?: string,
    score?: number,
    timeTaken?: number,
    text?: string
  ): void {
    if (!gameId) return;

    // Debounce duplicate reports for the same game within 4 seconds
    const key = `${gameId}_result_${mode}`;
    const now = Date.now();
    const last = this.lastReportedTime.get(key) || 0;
    if (now - last < 4000) return;
    this.lastReportedTime.set(key, now);

    const user = this.auth.currentUser();
    const username = user?.username || this.auth.guestId;
    const avatar = user?.avatar || '';

    this.ws.sendLobbyAction('report_activity', {
      activityType: won ? 'game_win' : 'game_lose',
      gameId,
      mode: mode || 'single',
      diff: diff || '',
      score: score || 0,
      timeTaken: timeTaken || 0,
      avatar,
      username,
      text: text || '',
    });
  }

  /**
   * Report game milestone achievement (e.g. synthesize 2048, clear 20 lines)
   */
  reportMilestone(gameId: string, milestoneText: string): void {
    if (!gameId || !milestoneText) return;

    const user = this.auth.currentUser();
    const username = user?.username || this.auth.guestId;

    this.ws.sendLobbyAction('report_activity', {
      activityType: 'milestone',
      gameId,
      text: milestoneText,
      username,
    });
  }

  /**
   * Send friendly cheer reaction to another player
   */
  sendCheer(targetUsername: string, gameId: string): void {
    if (!targetUsername) return;
    this.ws.sendLobbyAction('cheer', {
      targetId: targetUsername,
      gameId,
    });
  }

  /**
   * Format relative timestamp
   */
  formatTimeAgo(timestamp: number): string {
    if (!timestamp) return this.i18n.t('activity.just_now')() || '刚刚';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) {
      return this.i18n.t('activity.just_now')() || '刚刚';
    }
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) {
      const template = this.i18n.t('activity.mins_ago')() || '{n}分钟前';
      return template.replace(/\{\{n\}\}|\{n\}/g, String(mins));
    }
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  }
}
