import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BlogLanguageMeta {
  title: string;
  description: string;
  keywords: string;
  readTime: string;
  author: string;
  tags: string[];
  content?: string;
}

export interface BlogPostMeta {
  id: string;         // slug — kept as "id" for template compat
  dbId?: number;      // numeric DB id (only in admin context)
  date: string;
  published?: boolean;
  sort_order?: number;
  cover_image?: string;
  en: BlogLanguageMeta;
  zh: BlogLanguageMeta;
}

/** Shape returned by /api/v1/blog/posts */
interface BlogPostAPI {
  id: number;
  id_slug: string;
  date: string;
  published: boolean;
  sort_order: number;
  cover_image: string;
  en: { title: string; description: string; keywords: string; readTime: string; author: string; tags: string[]; content?: string };
  zh: { title: string; description: string; keywords: string; readTime: string; author: string; tags: string[]; content?: string };
  created_at: string;
  updated_at: string;
}

function apiToMeta(p: BlogPostAPI): BlogPostMeta {
  return {
    id: p.id_slug,
    dbId: p.id,
    date: p.date,
    published: p.published,
    sort_order: p.sort_order,
    cover_image: p.cover_image,
    en: {
      title: p.en.title,
      description: p.en.description,
      keywords: p.en.keywords,
      readTime: p.en.readTime,
      author: p.en.author,
      tags: p.en.tags ?? [],
      content: p.en.content,
    },
    zh: {
      title: p.zh.title,
      description: p.zh.description,
      keywords: p.zh.keywords,
      readTime: p.zh.readTime,
      author: p.zh.author,
      tags: p.zh.tags ?? [],
      content: p.zh.content,
    },
  };
}

@Injectable({ providedIn: 'root' })
export class BlogService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getBlogPosts(): Observable<BlogPostMeta[]> {
    return this.http.get<BlogPostMeta[]>('/assets/blog/index.json');
  }

  getBlogPost(slug: string): Observable<BlogPostMeta> {
    return this.http.get<BlogPostMeta>(`/assets/blog/${slug}.json`);
  }

  // ---- Admin API ----

  adminListAll(): Observable<BlogPostMeta[]> {
    return this.http
      .get<BlogPostAPI[]>(`${this.base}/admin/blog/posts`)
      .pipe(map(posts => posts.map(apiToMeta)));
  }

  adminGet(id: number): Observable<BlogPostMeta> {
    return this.http
      .get<BlogPostAPI>(`${this.base}/admin/blog/posts/${id}`)
      .pipe(map(apiToMeta));
  }

  adminCreate(body: AdminBlogPostInput): Observable<BlogPostMeta> {
    return this.http
      .post<BlogPostAPI>(`${this.base}/admin/blog/posts`, body)
      .pipe(map(apiToMeta));
  }

  adminUpdate(id: number, body: AdminBlogPostInput): Observable<BlogPostMeta> {
    return this.http
      .put<BlogPostAPI>(`${this.base}/admin/blog/posts/${id}`, body)
      .pipe(map(apiToMeta));
  }

  adminDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/blog/posts/${id}`);
  }

  adminToggle(id: number): Observable<{ published: boolean }> {
    return this.http.patch<{ published: boolean }>(`${this.base}/admin/blog/posts/${id}/toggle`, {});
  }
}

export interface AdminBlogPostInput {
  slug: string;
  date: string;
  published: boolean;
  sort_order: number;
  cover_image: string;
  title_en: string; desc_en: string; keywords_en: string; read_time_en: string; author_en: string; tags_en: string[]; content_en: string;
  title_zh: string; desc_zh: string; keywords_zh: string; read_time_zh: string; author_zh: string; tags_zh: string[]; content_zh: string;
}
