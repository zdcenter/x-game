import { Injectable, inject, signal, effect, computed, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { WebSocketService } from './websocket.service';
import { catchError, map, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ToastService } from './toast.service';
import { CrossGameJoinService } from './cross-game-join.service';
import { Router } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';

export interface Friend {
  id: number;
  username: string;
  avatar: string;
  status: 'accepted' | 'pending_sent' | 'pending_received';
  is_online?: boolean; // We will populate this via websocket
}

@Injectable({
  providedIn: 'root'
})
export class FriendService {
  private http = inject(HttpClient);
  private wsService = inject(WebSocketService);
  private toastService = inject(ToastService);
  private crossGameJoin = inject(CrossGameJoinService);
  private router = inject(Router);
  private i18n = inject(I18nService);
  private apiUrl = `${environment.apiUrl}/friends`;

  // Reactive state
  private _rawFriends = signal<Friend[]>([]);
  readonly friends: Signal<Friend[]> = computed(() => {
    const onlineUsernames = new Set(this.wsService.onlinePlayers().map(p => p.username || p.id));
    return this._rawFriends().map(f => {
      if (f.status === 'accepted') {
        return { ...f, is_online: onlineUsernames.has(f.username) };
      }
      return f;
    }).sort((a, b) => {
      if (a.is_online === b.is_online) return 0;
      return a.is_online ? -1 : 1;
    });
  });
  readonly onlineFriendIds = signal<Set<number>>(new Set());

  // Global state for friend panel visibility
  readonly isPanelOpen = signal(false);
  readonly panelContext = signal<{ gameId?: string, difficulty?: string, mode?: string } | null>(null);

  constructor() {
    this.setupWebSocketListeners();
  }

  togglePanel(forceState?: boolean, context?: { gameId?: string, difficulty?: string, mode?: string }) {
    const newState = forceState !== undefined ? forceState : !this.isPanelOpen();
    this.isPanelOpen.set(newState);
    if (context) {
      this.panelContext.set(context);
    } else if (!newState) {
      this.panelContext.set(null); // clear on close
    }
    if (newState) {
      this.loadFriends().subscribe();
    }
  }

  // Fetch all friends and requests
  loadFriends() {
    return this.http.get<{friends: Friend[]}>(this.apiUrl).pipe(
      tap(res => {
        this._rawFriends.set(res.friends || []);
      }),
      catchError(err => {
        console.error('Failed to load friends', err);
        return of({friends: []});
      })
    );
  }

  sendRequest(targetId: number) {
    return this.http.post(`${this.apiUrl}/request`, { target_id: targetId }).pipe(
      tap(() => this.loadFriends().subscribe()) // Reload after sending request
    );
  }

  sendRequestByUsername(username: string) {
    return this.http.post(`${this.apiUrl}/request`, { username }).pipe(
      tap(() => this.loadFriends().subscribe()) // Reload after sending request
    );
  }

  acceptRequest(targetId: number) {
    return this.http.post(`${this.apiUrl}/accept`, { target_id: targetId }).pipe(
      tap(() => this.loadFriends().subscribe())
    );
  }

  rejectRequest(targetId: number) {
    return this.http.post(`${this.apiUrl}/reject`, { target_id: targetId }).pipe(
      tap(() => this.loadFriends().subscribe())
    );
  }

  sendInvite(targetUsername: string, roomId: string) {
    this.wsService.sendLobbyAction('friend_invite', { targetId: targetUsername, roomId });
  }

  private setupWebSocketListeners() {

    effect(() => {
      const event = this.wsService.friendInviteEvent();
      if (!event) return;
      const { sender_name, room } = event;
      if (!room) return;

      const gameTitle = this.i18n.t('game.' + room.game)() || room.game;
      this.toastService.showInvite({
        senderName: sender_name,
        gameTitle,
        room,
        onAccept: () => {
          this.crossGameJoin.setPendingJoin({
            game: room.game,
            roomId: room.id,
            mode: room.mode,
            difficulty: room.difficulty,
            host: room.host,
            password: room.password || '' // Auto-join with the password from the invite
          });

          const lang = this.i18n.currentLang() || 'zh';
          const targetUrl = `/${lang}/games/${room.game}`;
          const currentPath = this.router.url.split('?')[0];
          if (currentPath !== targetUrl) {
            this.router.navigate([targetUrl]);
          }
        },
        onDismiss: () => {
          // Handled cleanly by toastService.dismissInvite()
        }
      });
    });
  }
}
