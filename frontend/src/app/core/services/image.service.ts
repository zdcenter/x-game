import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  getImageRaw(key: string): Observable<string> {
    return this.http.get(`${this.base}/admin/images/raw`, {
      params: { key },
      responseType: 'text',
    });
  }

  uploadBlob(blob: Blob, filename: string): Observable<ImageItem> {
    const fd = new FormData();
    fd.append('files', new File([blob], filename, { type: blob.type }));
    return this.http.post<ImageItem[]>(`${this.base}/admin/images/upload`, fd).pipe(
      map(items => items[0])
    );
  }

  // Cover generation — returns SVG string + target PNG key
  getBlogCoverSvg(id: number): Observable<{ svg: string; key: string }> {
    return this.http.post<{ svg: string; key: string }>(`${this.base}/admin/blog/posts/${id}/cover`, {});
  }

  setBlogCoverImage(id: number, url: string): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/admin/blog/posts/${id}/cover`, { url });
  }

  generateBlogCoversBatch(): Observable<{ results: any[]; total: number }> {
    return this.http.post<{ results: any[]; total: number }>(`${this.base}/admin/blog/posts/covers/batch`, {});
  }

  getArticleCoverSvg(id: number): Observable<{ svg: string; key: string }> {
    return this.http.post<{ svg: string; key: string }>(`${this.base}/admin/content/articles/${id}/cover`, {});
  }

  setArticleCoverImage(id: number, url: string): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/admin/content/articles/${id}/cover`, { url });
  }

  generateArticleCoversBatch(): Observable<{ results: any[]; total: number }> {
    return this.http.post<{ results: any[]; total: number }>(`${this.base}/admin/content/articles/covers/batch`, {});
  }
}
