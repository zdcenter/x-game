import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ImageItem {
  key: string;
  url: string;
  size: number;
  last_modified: string;
}

@Injectable({ providedIn: 'root' })
export class ImageService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(prefix = ''): Observable<ImageItem[]> {
    const url = `${this.base}/admin/images`;
    return prefix
      ? this.http.get<ImageItem[]>(url, { params: { prefix } })
      : this.http.get<ImageItem[]>(url);
  }

  upload(files: File[]): Observable<ImageItem[]> {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return this.http.post<ImageItem[]>(`${this.base}/admin/images/upload`, fd);
  }

  deleteMany(keys: string[]): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.base}/admin/images`, { body: { keys } });
  }

  generateBlogCover(id: number): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.base}/admin/blog/posts/${id}/cover`, {});
  }

  generateBlogCoversBatch(): Observable<{ results: any[]; total: number }> {
    return this.http.post<{ results: any[]; total: number }>(`${this.base}/admin/blog/posts/covers/batch`, {});
  }

  generateArticleCover(id: number): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.base}/admin/content/articles/${id}/cover`, {});
  }

  generateArticleCoversBatch(): Observable<{ results: any[]; total: number }> {
    return this.http.post<{ results: any[]; total: number }>(`${this.base}/admin/content/articles/covers/batch`, {});
  }
}
