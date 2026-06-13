import { Injectable, signal, computed } from '@angular/core';
import { storageGet, storageSet, isBrowser } from '../utils/browser.util';

export type UserRole = 'user' | 'admin' | 'guest';
export type UserStatus = 'active' | 'banned';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  status: UserStatus;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
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
    
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const savedToken = storageGet('x_game_token');
    const savedUser = storageGet('x_game_user');
    
    if (savedToken && savedUser) {
      try {
        this.token.set(savedToken);
        this.currentUser.set(JSON.parse(savedUser));
      } catch (e) {
        this.logout();
      }
    }
  }

  setCredentials(token: string, user: User) {
    storageSet('x_game_token', token);
    storageSet('x_game_user', JSON.stringify(user));
    this.token.set(token);
    this.currentUser.set(user);
  }

  logout() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('x_game_token');
      localStorage.removeItem('x_game_user');
    }
    this.token.set(null);
    this.currentUser.set(null);
  }
}
