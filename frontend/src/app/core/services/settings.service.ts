import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface PublicSettings {
  site_maintenance: string;
  maintenance_message: string;
  global_announcement: string;
  registration_enabled: string;
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private http = inject(HttpClient);
  
  public settings = signal<PublicSettings>({
    site_maintenance: 'false',
    maintenance_message: '',
    global_announcement: '',
    registration_enabled: 'true'
  });

  loadSettings() {
    return this.http.get<PublicSettings>(`${environment.apiUrl}/settings`).pipe(
      tap(res => {
        if (res) {
          this.settings.set({ ...this.settings(), ...res });
        }
      }),
      catchError(err => {
        console.error('Failed to load system settings', err);
        return of(null);
      })
    );
  }
}
