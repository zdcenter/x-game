import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { storageGet, storageSet, storageRemove, cookieGet, cookieSet, cookieRemove } from '../utils/browser.util';
import { environment } from '../../../environments/environment';

export type UserRole = 'user' | 'admin' | 'guest';
export type UserStatus = 'active' | 'banned';

export interface User {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  xp: number;
  level: number;
  login_streak: number;
  last_login_date: string;
  streak_freezes?: number;
  brain_coins?: number;
  equipped_frame?: string;
  equipped_title?: string;
  unlocked_frames?: string;
  unlocked_titles?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  private http = inject(HttpClient);
  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  
  // Persist guestId to avoid changing identity on page refresh
  readonly guestId: string;

  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor() {
    const savedGuestId = storageGet('x_game_guest_id');
    if (savedGuestId) {
      this.guestId = savedGuestId;
    } else {
      this.guestId = `Guest_${Math.floor(Math.random() * 10000)}`;
      storageSet('x_game_guest_id', this.guestId);
    }
    
    this.ensureLoaded();
  }

  ensureLoaded() {
    // If already populated in memory, skip
    if (this.token() && this.currentUser()) return;

    let savedToken = storageGet('x_game_token');
    let savedUser = storageGet('x_game_user');

    // Dual-Persistence Fallback: if localStorage is missing, check cookie
    if (!savedToken) {
      savedToken = cookieGet('x_game_token');
    }
    if (!savedUser) {
      savedUser = cookieGet('x_game_user');
    }
    
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        this.token.set(savedToken);
        this.currentUser.set(parsedUser);
      } catch (e) {
        this.logout();
      }
    }
  }

  setCredentials(token: string, user: User) {
    const userStr = JSON.stringify(user);
    // 1. LocalStorage
    storageSet('x_game_token', token);
    storageSet('x_game_user', userStr);
    // 2. Cookie (30 days lifespan, dual-persistence)
    cookieSet('x_game_token', token, 30);
    cookieSet('x_game_user', userStr, 30);

    this.token.set(token);
    this.currentUser.set(user);
  }

  updateUser(user: User) {
    const userStr = JSON.stringify(user);
    storageSet('x_game_user', userStr);
    cookieSet('x_game_user', userStr, 30);
    this.currentUser.set(user);
  }

  logout() {
    storageRemove('x_game_token');
    storageRemove('x_game_user');
    cookieRemove('x_game_token');
    cookieRemove('x_game_user');
    this.token.set(null);
    this.currentUser.set(null);
  }

  refreshProfile(): void {
    if (!this.token()) return;
    // X-Skip-Logout prevents authInterceptor from calling logout() on 401.
    // Background refresh failure should not silently sign the user out.
    // /profile/me returns { user: User, login_streak, ... } — extract .user
    this.http.get<{ user: User }>(`${environment.apiUrl}/profile/me`, {
      headers: { 'X-Skip-Logout': 'true' }
    }).subscribe({
      next: resp => {
        const user = resp.user;
        storageSet('x_game_user', JSON.stringify(user));
        this.currentUser.set(user);
      },
      error: () => {}
    });
  }
}
