import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Announcement {
  id: number;
  content: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Public
  getActiveAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.baseUrl}/announcements`);
  }

  // Admin
  getAdminAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.baseUrl}/admin/announcements`);
  }

  createAnnouncement(data: { content: string; is_active: boolean; sort_order: number }): Observable<Announcement> {
    return this.http.post<Announcement>(`${this.baseUrl}/admin/announcements`, data);
  }

  updateAnnouncement(id: number, data: Partial<Announcement>): Observable<Announcement> {
    return this.http.put<Announcement>(`${this.baseUrl}/admin/announcements/${id}`, data);
  }

  deleteAnnouncement(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/announcements/${id}`);
  }
}
