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
  multiplayer_enabled: string;
  ad_interstitial_frequency: string;
  ad_interstitial_daily_limit: string;
  ad_pc_left_slot: string;
  ad_pc_right_slot: string;
  ad_mobile_lobby_slot: string;
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
    registration_enabled: 'true',
    multiplayer_enabled: 'true',
    ad_interstitial_frequency: '3',
    ad_interstitial_daily_limit: '3',
    ad_pc_left_slot: '',
    ad_pc_right_slot: '',
    ad_mobile_lobby_slot: ''
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
