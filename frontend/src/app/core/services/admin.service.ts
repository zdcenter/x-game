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

  toggleUserStatus(userId: number, newStatus: 'active' | 'banned'): Observable<ToggleStatusResponse> {
    return this.http.put<ToggleStatusResponse>(`${this.baseUrl}/users/${userId}/status`, { status: newStatus });
  }
}
