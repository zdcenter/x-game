import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  private readonly baseUrl = 'http://localhost:3001/api/v1/admin';

  getUsers(): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(`${this.baseUrl}/users`);
  }

  toggleUserStatus(userId: number, newStatus: 'active' | 'banned'): Observable<ToggleStatusResponse> {
    return this.http.put<ToggleStatusResponse>(`${this.baseUrl}/users/${userId}/status`, { status: newStatus });
  }
}
