import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../auth/auth.store';
import { AuthStore } from '../auth/auth.store';

export interface UsersResponse {
  users: User[];
  error?: string;
}

export interface ToggleStatusResponse {
  message?: string;
  user?: User;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private authStore = inject(AuthStore);
  private readonly baseUrl = environment.apiUrl + '/admin';

  getUsers(): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(`${this.baseUrl}/users`);
  }

  toggleUserStatus(userId: number, newStatus: 'active' | 'banned'): Observable<{message: string}> {
    return this.http.put<{message: string}>(`${this.baseUrl}/users/${userId}/status`, { status: newStatus });
  }

  // Games
  getGames(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/games`);
  }

  updateGame(gameId: string, overview: string, rules: string, config: string, isActive: boolean, sortOrder: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/games/${gameId}`, { overview, rules, config, isActive, sortOrder });
  }

  connectRealtimeWS(): Observable<any> {
    const wsUrl = environment.wsUrl || environment.apiUrl.replace('http', 'ws');
    const token = this.authStore.token();
    
    return new Observable(observer => {
      const ws = new WebSocket(`${wsUrl}/ws/admin?token=${token}`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          observer.next(data);
        } catch (e) {
          console.error('Failed to parse admin ws message', e);
        }
      };
      
      ws.onerror = (err) => observer.error(err);
      ws.onclose = () => observer.complete();
      
      // Cleanup on unsubscribe
      return () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };
    });
  }
}
