import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ContentCategory {
  id: number;
  slug: string;
  name_en: string;
  name_zh: string;
  desc_en: string;
  desc_zh: string;
  parent_id: number | null;
  sort_order: number;
}

export interface ContentCategoryInput {
  slug: string;
  name_en: string;
  name_zh: string;
  desc_en?: string;
  desc_zh?: string;
  parent_id?: number | null;
  sort_order?: number;
}

export interface ContentArticleMeta {
  id: number;
  slug: string;
  category_id: number | null;
  title_en: string;
  title_zh: string;
  desc_en: string;
  desc_zh: string;
  tags_en: string; // JSON string
  tags_zh: string;
  published: boolean;
  sort_order: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface ContentArticleFull extends ContentArticleMeta {
  content_en: string;
  content_zh: string;
  author_en: string;
  author_zh: string;
  source_url: string;
}

export interface ContentArticleInput {
  slug: string;
  category_id: number | null;
  title_en: string; title_zh: string;
  desc_en: string;  desc_zh: string;
  content_en: string; content_zh: string;
  tags_en: string[]; tags_zh: string[];
  author_en: string; author_zh: string;
  source_url: string;
  published: boolean;
  sort_order: number;
  date: string;
}

export interface ContentDistributionRecord {
  id: number;
  article_id: number;
  platform: string;
  lang: string;
  last_copied_at: string;
  copy_count: number;
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  listCategories(): Observable<ContentCategory[]> {
    return this.http.get<ContentCategory[]>(`${this.base}/admin/content/categories`);
  }
  createCategory(body: ContentCategoryInput): Observable<ContentCategory> {
    return this.http.post<ContentCategory>(`${this.base}/admin/content/categories`, body);
  }
  updateCategory(id: number, body: ContentCategoryInput): Observable<ContentCategory> {
    return this.http.put<ContentCategory>(`${this.base}/admin/content/categories/${id}`, body);
  }
  deleteCategory(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/admin/content/categories/${id}`);
  }

  listArticles(categoryId?: number | null): Observable<ContentArticleMeta[]> {
    const q = categoryId != null ? `?category_id=${categoryId}` : '';
    return this.http.get<ContentArticleMeta[]>(`${this.base}/admin/content/articles${q}`);
  }
  getArticle(id: number): Observable<ContentArticleFull> {
    return this.http.get<ContentArticleFull>(`${this.base}/admin/content/articles/${id}`);
  }
  createArticle(body: ContentArticleInput): Observable<ContentArticleFull> {
    return this.http.post<ContentArticleFull>(`${this.base}/admin/content/articles`, body);
  }
  updateArticle(id: number, body: ContentArticleInput): Observable<ContentArticleFull> {
    return this.http.put<ContentArticleFull>(`${this.base}/admin/content/articles/${id}`, body);
  }
  deleteArticle(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/admin/content/articles/${id}`);
  }
  toggleArticle(id: number): Observable<{ published: boolean }> {
    return this.http.patch<{ published: boolean }>(`${this.base}/admin/content/articles/${id}/toggle`, {});
  }

  getDistributions(articleId: number): Observable<ContentDistributionRecord[]> {
    return this.http.get<ContentDistributionRecord[]>(`${this.base}/admin/content/articles/${articleId}/distributions`);
  }
  recordDistribution(articleId: number, platform: string, lang: string): Observable<{ ok: boolean; copy_count: number }> {
    return this.http.post<{ ok: boolean; copy_count: number }>(
      `${this.base}/admin/content/articles/${articleId}/distribute`,
      { platform, lang }
    );
  }
}
