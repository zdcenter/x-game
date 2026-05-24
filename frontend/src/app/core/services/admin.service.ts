import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../auth/auth.store';

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

  updateGame(gameId: string, rules: string, isActive: boolean): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/games/${gameId}`, { rules, isActive });
  }
}
