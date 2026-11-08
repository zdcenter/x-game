import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';
import { AudioService } from './audio.service';
import { HapticService } from './haptic.service';
import { Router } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';

export interface NotificationItem {
  id: number;
  user_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  type: 'record_broken' | 'system';
  game_id: string;
  difficulty: string;
  old_record: number;
  new_record: number;
  rank_type: 'time' | 'score';
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private audio = inject(AudioService);
  private haptic = inject(HapticService);
  private router = inject(Router);
  private i18n = inject(I18nService);

  private apiUrl = `${environment.apiUrl}/notifications`;

  notifications = signal<NotificationItem[]>([]);
  unreadCount = signal<number>(0);

  // Active revenge modal trigger
  activeRevengeModal = signal<NotificationItem | null>(null);

  // Real-time slide-in alert
  realtimeAlert = signal<NotificationItem | null>(null);

  constructor() {
    // Whenever auth status changes to logged in, fetch notifications
    effect(() => {
      const user = this.authStore.currentUser();
      if (user && user.role !== 'guest') {
        this.fetchNotifications();
      } else {
        this.notifications.set([]);
        this.unreadCount.set(0);
      }
    });
  }

  fetchNotifications(): void {
    if (!this.authStore.isAuthenticated() || this.authStore.currentUser()?.role === 'guest') {
      return;
    }

    this.http.get<{ notifications: NotificationItem[]; unread_count: number }>(this.apiUrl).subscribe({
      next: res => {
        this.notifications.set(res.notifications || []);
        this.unreadCount.set(res.unread_count || 0);

        // Check if there is an unread record_broken notification that hasn't been shown in this session
        const latestUnreadRevenge = (res.notifications || []).find(n => n.type === 'record_broken' && !n.is_read);
        if (latestUnreadRevenge && typeof sessionStorage !== 'undefined') {
          const shownKey = `revenge_shown_${latestUnreadRevenge.id}`;
          if (!sessionStorage.getItem(shownKey)) {
            sessionStorage.setItem(shownKey, '1');
            setTimeout(() => {
              this.activeRevengeModal.set(latestUnreadRevenge);
            }, 1000);
          }
        }
      },
      error: () => {}
    });
  }

  markAsRead(id: number): void {
    this.http.post(`${this.apiUrl}/read`, { id }).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      }
    });
  }

  markAllAsRead(): void {
    this.haptic.vibrateLight();
    this.audio.playClick();
    this.http.post(`${this.apiUrl}/read-all`, {}).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => ({ ...n, is_read: true }))
        );
        this.unreadCount.set(0);
      }
    });
  }

  handleRealtimeRecordBroken(data: any): void {
    const notif: NotificationItem = data.notification || {
      id: Date.now(),
      user_id: data.target_user_id || this.authStore.currentUser()?.id || 0,
      sender_id: data.breaker_id || 0,
      sender_name: data.breaker_name || '神秘对手',
      sender_avatar: data.breaker_avatar,
      type: 'record_broken',
      game_id: data.game_id,
      difficulty: data.difficulty,
      old_record: data.old_record,
      new_record: data.new_record,
      rank_type: data.rank_type || 'time',
      title: '王座失守警告！',
      content: `你的纪录被 ${data.breaker_name} 破了！`,
      is_read: false,
      created_at: new Date().toISOString()
    };

    // Prepend to notifications
    this.notifications.update(list => [notif, ...list]);
    this.unreadCount.update(c => c + 1);

    // Audio & haptic cue
    this.audio.playLose(true);
    this.haptic.vibrateError();

    // Show instant sliding alert
    this.realtimeAlert.set(notif);

    // Also pop revenge modal after a brief moment
    setTimeout(() => {
      this.activeRevengeModal.set(notif);
    }, 800);
  }

  dismissRealtimeAlert(): void {
    this.realtimeAlert.set(null);
  }

  openRevenge(item: NotificationItem): void {
    this.haptic.vibrateLight();
    this.audio.playClick();
    this.activeRevengeModal.set(item);
  }

  closeRevenge(): void {
    this.activeRevengeModal.set(null);
  }

  launchRevenge(item: NotificationItem): void {
    this.haptic.vibrateSuccess();
    this.audio.playClick();
    this.markAsRead(item.id);
    this.activeRevengeModal.set(null);
    this.realtimeAlert.set(null);

    const lang = this.i18n.currentLang();
    const queryParams: Record<string, string> = {
      challenge: 'revenge',
      rival: item.sender_name,
      target: String(item.new_record)
    };
    if (item.difficulty) {
      queryParams['difficulty'] = item.difficulty;
    }

    this.router.navigate(['/', lang, 'games', item.game_id], { queryParams });
  }
}
