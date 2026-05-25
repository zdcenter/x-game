import { Injectable, signal, computed } from '@angular/core';

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

  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const savedToken = localStorage.getItem('x_game_token');
    const savedUser = localStorage.getItem('x_game_user');
    
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
    localStorage.setItem('x_game_token', token);
    localStorage.setItem('x_game_user', JSON.stringify(user));
    this.token.set(token);
    this.currentUser.set(user);
  }

  logout() {
    localStorage.removeItem('x_game_token');
    localStorage.removeItem('x_game_user');
    this.token.set(null);
    this.currentUser.set(null);
  }
}
