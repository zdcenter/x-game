import { Injectable, inject, signal, computed } from '@angular/core';
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
  pk_multi_round_enabled: string;
  ad_interstitial_frequency: string;
  ad_auto_next_frequency: string;
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
    pk_multi_round_enabled: 'true',
    ad_interstitial_frequency: '3',
    ad_auto_next_frequency: '3',
    ad_interstitial_daily_limit: '3',
    ad_pc_left_slot: '',
    ad_pc_right_slot: '',
    ad_mobile_lobby_slot: ''
  });

  // Reactive computed for coin economy parameters
  readonly coinEconomy = computed(() => {
    const s = this.settings();
    return {
      soloEasy: parseInt(s['coins.solo_easy'] || '2', 10),
      soloMedium: parseInt(s['coins.solo_medium'] || '5', 10),
      soloHard: parseInt(s['coins.solo_hard'] || '10', 10),
      soloExpert: parseInt(s['coins.solo_expert'] || '18', 10),
      soloMaster: parseInt(s['coins.solo_master'] || '25', 10),
      soloDefeat: parseInt(s['coins.solo_defeat'] || '0', 10),
      pkWin: parseInt(s['coins.pk_win'] || '5', 10),
      pkDefeat: parseInt(s['coins.pk_defeat'] || '0', 10),
      costHint: parseInt(s['coins.cost_hint'] || '20', 10),
      costRevive: parseInt(s['coins.cost_revive'] || '50', 10),
      costFreeze: parseInt(s['coins.cost_freeze'] || '100', 10),
      dailyCap: parseInt(s['coins.daily_cap'] || '80', 10),
      registerBonus: parseInt(s['coins.register_bonus'] || '0', 10),
    };
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

