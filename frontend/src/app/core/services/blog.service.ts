import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BlogLanguageMeta {
  title: string;
  description: string;
  keywords: string;
  readTime: string;
  author: string;
  tags: string[];
}

export interface BlogPostMeta {
  id: string;
  date: string;
  en: BlogLanguageMeta;
  zh: BlogLanguageMeta;
}

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private http = inject(HttpClient);
  
  // Fetch the list of all blog posts metadata
  getBlogPosts(): Observable<BlogPostMeta[]> {
    // Adding timestamp to prevent aggressive caching
    return this.http.get<BlogPostMeta[]>(`/assets/blog/index.json?t=${new Date().getTime()}`);
  }

  // Fetch the markdown content of a specific post based on language
  getPostContent(id: string, lang: string): Observable<string> {
    const fileSuffix = lang === 'zh' ? '_zh' : '_en';
    return this.http.get(`/assets/blog/posts/${id}${fileSuffix}.md`, { responseType: 'text' });
  }
}
