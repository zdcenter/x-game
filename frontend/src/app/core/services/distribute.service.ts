import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DistributionRecord {
  id: number;
  post_id: number;
  platform: string;
  lang: string;
  last_copied_at: string;
  copy_count: number;
  title_en?: string;
  title_zh?: string;
  slug?: string;
}

@Injectable({ providedIn: 'root' })
export class DistributeService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getDistributions(): Observable<DistributionRecord[]> {
    return this.http.get<DistributionRecord[]>(`${this.base}/admin/blog/distributions`);
  }

  record(postId: number, platform: string, lang: string): Observable<{ ok: boolean; copy_count: number }> {
    return this.http.post<{ ok: boolean; copy_count: number }>(
      `${this.base}/admin/blog/posts/${postId}/distribute`,
      { platform, lang }
    );
  }
}
