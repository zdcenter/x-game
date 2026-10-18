import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BrainDimension {
  key: string;
  name_key: string;
  icon: string;
  score: number;
  max: number;
  pct: number;
  games: string[];
}

export interface BrainRadarData {
  bq: number;
  max_bq: number;
  tier_key: string;
  tier_name: string;
  dimensions: BrainDimension[];
  total_played: number;
  total_wins: number;
}

@Injectable({ providedIn: 'root' })
export class BrainRadarService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  radarData = signal<BrainRadarData | null>(null);

  getRadar(): Observable<BrainRadarData> {
    return this.http.get<BrainRadarData>(`${this.apiUrl}/profile/radar`).pipe(
      tap(data => this.radarData.set(data))
    );
  }
}
