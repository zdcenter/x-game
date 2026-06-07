import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
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
  private location = inject(Location);
  
  // Fetch the list of all blog posts metadata
  getBlogPosts(): Observable<BlogPostMeta[]> {
    // Adding timestamp to prevent aggressive caching
    const url = this.location.prepareExternalUrl('assets/blog/index.json');
    return this.http.get<BlogPostMeta[]>(`${url}?t=${new Date().getTime()}`);
  }

  // Fetch the markdown content of a specific post based on language
  getPostContent(id: string, lang: string): Observable<string> {
    const fileSuffix = lang === 'zh' ? '_zh' : '_en';
    const url = this.location.prepareExternalUrl(`assets/blog/posts/${id}${fileSuffix}.md`);
    return this.http.get(url, { responseType: 'text' });
  }
}
