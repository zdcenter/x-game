import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isBrowser, storageGet, storageSet } from '../utils/browser.util';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';
import { SubmitStatRequest, SubmitStatResponse } from './game-stats.service';

export interface QueuedOfflineStat {
  id: string;
  gameId: string;
  payload: SubmitStatRequest;
  timestamp: number;
}

const STORAGE_KEY = 'xgame_offline_stat_queue';

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);
  private apiUrl = environment.apiUrl;

  readonly isOnline = signal<boolean>(
    isBrowser() && typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  readonly isOffline = computed(() => !this.isOnline());
  readonly pendingCount = signal<number>(0);
  readonly isSyncing = signal<boolean>(false);

  constructor() {
    if (!isBrowser()) return;

    this.refreshPendingCount();

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.syncPendingStats();
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  private getQueue(): QueuedOfflineStat[] {
    const raw = storageGet(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedOfflineStat[]) {
    storageSet(STORAGE_KEY, JSON.stringify(queue));
    this.pendingCount.set(queue.length);
  }

  refreshPendingCount(): void {
    this.pendingCount.set(this.getQueue().length);
  }

  /**
   * Queue a single-player game stat locally when offline or when network call fails.
   */
  queueStat(gameId: string, payload: SubmitStatRequest): SubmitStatResponse {
    const queue = this.getQueue();
    const item: QueuedOfflineStat = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      gameId,
      payload,
      timestamp: Date.now()
    };
    queue.push(item);
    this.saveQueue(queue);

    return {
      message: 'queued_offline',
      stat: {
        ID: 0,
        UserID: 0,
        GameID: gameId,
        Mode: payload.mode,
        Difficulty: payload.difficulty,
        BestScore: payload.score,
        BestTime: payload.time,
        PlayCount: 1,
        WinCount: payload.won ? 1 : 0,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      },
      isNewRecord: false,
      xp_result: {
        xp_earned: 0,
        xp: 0,
        level: 1,
        leveled_up: false
      }
    };
  }

  /**
   * Replay and flush all queued stats to the server when network connectivity is restored.
   */
  async syncPendingStats(): Promise<void> {
    if (!this.isOnline() || this.isSyncing()) return;

    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing.set(true);
    let successCount = 0;
    const remainingQueue: QueuedOfflineStat[] = [];

    for (const item of queue) {
      try {
        await this.http.post<SubmitStatResponse>(
          `${this.apiUrl}/stats/${item.gameId}`,
          item.payload
        ).toPromise();
        successCount++;
      } catch (err) {
        // Keep in queue if server returned error or network drop again
        remainingQueue.push(item);
      }
    }

    this.saveQueue(remainingQueue);
    this.isSyncing.set(false);

    if (successCount > 0) {
      const msg = this.i18n.t('offline.sync_success')().replace('{count}', successCount.toString()) ||
        `离线战绩已自动同步到云端 (${successCount} 局)`;
      this.toast.show(msg, 'success');
    }
  }
}
