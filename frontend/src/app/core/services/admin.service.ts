import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
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

  // System Settings
  getSettings(): Observable<any> {
    return this.http.get(`${this.baseUrl}/settings`);
  }

  getSettingsMap(): Observable<Record<string, string>> {
    return this.http.get<{ settings: { key: string; value: string }[] }>(`${this.baseUrl}/settings`).pipe(
      map(res => Object.fromEntries((res.settings ?? []).map(s => [s.key, s.value])))
    );
  }

  updateSettings(settings: Record<string, string>): Observable<any> {
    return this.http.put(`${this.baseUrl}/settings`, { settings });
  }

  // Ad Management
  getAdPlacements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/ads/placements`);
  }

  updateAdPlacement(id: string, payload: { is_enabled: boolean, daily_total_limit: number }): Observable<any> {
    return this.http.put(`${this.baseUrl}/ads/placements/${id}`, payload);
  }

  addAdNetwork(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ads/networks`, payload);
  }

  updateAdNetwork(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/ads/networks/${id}`, payload);
  }

  deleteAdNetwork(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/ads/networks/${id}`);
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
