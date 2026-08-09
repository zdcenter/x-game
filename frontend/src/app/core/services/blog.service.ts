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
  relatedGameId?: string;
  en: BlogLanguageMeta;
  zh: BlogLanguageMeta;
  es: BlogLanguageMeta;
  ja: BlogLanguageMeta;
  ko: BlogLanguageMeta;
  pt: BlogLanguageMeta;
  fr: BlogLanguageMeta;
  de: BlogLanguageMeta;
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
  es: { title: string; description: string; keywords: string; readTime: string; author: string; tags: string[]; content?: string };
  ja: { title: string; description: string; keywords: string; readTime: string; author: string; tags: string[]; content?: string };
  ko: { title: string; description: string; keywords: string; readTime: string; author: string; tags: string[]; content?: string };
  pt: { title: string; description: string; keywords: string; readTime: string; author: string; tags: string[]; content?: string };
  fr: { title: string; description: string; keywords: string; readTime: string; author: string; tags: string[]; content?: string };
  de: { title: string; description: string; keywords: string; readTime: string; author: string; tags: string[]; content?: string };
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
    // Add relatedGameId extraction here if it ever comes from backend API, currently static from JSON
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
    es: {
      title: p.es?.title || '',
      description: p.es?.description || '',
      keywords: p.es?.keywords || '',
      readTime: p.es?.readTime || '',
      author: p.es?.author || '',
      tags: p.es?.tags ?? [],
      content: p.es?.content,
    },
    ja: {
      title: p.ja?.title || '',
      description: p.ja?.description || '',
      keywords: p.ja?.keywords || '',
      readTime: p.ja?.readTime || '',
      author: p.ja?.author || '',
      tags: p.ja?.tags ?? [],
      content: p.ja?.content,
    },
    ko: {
      title: p.ko?.title || '',
      description: p.ko?.description || '',
      keywords: p.ko?.keywords || '',
      readTime: p.ko?.readTime || '',
      author: p.ko?.author || '',
      tags: p.ko?.tags ?? [],
      content: p.ko?.content,
    },
    pt: {
      title: p.pt?.title || '',
      description: p.pt?.description || '',
      keywords: p.pt?.keywords || '',
      readTime: p.pt?.readTime || '',
      author: p.pt?.author || '',
      tags: p.pt?.tags ?? [],
      content: p.pt?.content,
    },
    fr: {
      title: p.fr?.title || '',
      description: p.fr?.description || '',
      keywords: p.fr?.keywords || '',
      readTime: p.fr?.readTime || '',
      author: p.fr?.author || '',
      tags: p.fr?.tags ?? [],
      content: p.fr?.content,
    },
    de: {
      title: p.de?.title || '',
      description: p.de?.description || '',
      keywords: p.de?.keywords || '',
      readTime: p.de?.readTime || '',
      author: p.de?.author || '',
      tags: p.de?.tags ?? [],
      content: p.de?.content,
    },
  };
}

@Injectable({ providedIn: 'root' })
export class BlogService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getBlogPosts(): Observable<BlogPostMeta[]> {
    const t = new Date().getTime();
    return this.http.get<BlogPostMeta[]>(`/assets/blog/index.json?t=${t}`);
  }

  getBlogPost(slug: string): Observable<BlogPostMeta> {
    const t = new Date().getTime();
    return this.http.get<BlogPostMeta>(`/assets/blog/${slug}.json?t=${t}`);
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
  title_es: string; desc_es: string; keywords_es: string; read_time_es: string; author_es: string; tags_es: string[]; content_es: string;
  title_ja: string; desc_ja: string; keywords_ja: string; read_time_ja: string; author_ja: string; tags_ja: string[]; content_ja: string;
  title_ko: string; desc_ko: string; keywords_ko: string; read_time_ko: string; author_ko: string; tags_ko: string[]; content_ko: string;
  title_pt: string; desc_pt: string; keywords_pt: string; read_time_pt: string; author_pt: string; tags_pt: string[]; content_pt: string;
  title_fr: string; desc_fr: string; keywords_fr: string; read_time_fr: string; author_fr: string; tags_fr: string[]; content_fr: string;
  title_de: string; desc_de: string; keywords_de: string; read_time_de: string; author_de: string; tags_de: string[]; content_de: string;
}
