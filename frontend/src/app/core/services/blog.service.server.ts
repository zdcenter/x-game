import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TransferState, makeStateKey } from '@angular/core';
import { BlogService, BlogPostMeta } from './blog.service';
import * as fs from 'node:fs';
import * as path from 'node:path';

function getBlogDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'public/assets/blog'),
    path.resolve(process.cwd(), 'frontend/public/assets/blog'),
    path.resolve(process.cwd(), 'dist/frontend/browser/assets/blog'),
    path.resolve(process.cwd(), 'frontend/dist/frontend/browser/assets/blog'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return path.resolve(process.cwd(), 'public/assets/blog');
}

@Injectable()
export class ServerBlogService extends BlogService {
  private blogDir = getBlogDir();

  override getBlogPosts(): Observable<BlogPostMeta[]> {
    const key = makeStateKey<BlogPostMeta[]>('blog_posts_all');
    try {
      const filePath = path.join(this.blogDir, 'index.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const list: BlogPostMeta[] = JSON.parse(raw);
        this.transferState.set(key, list);
        return of(list);
      }
    } catch (e) {
      console.error('[ServerBlogService] Error reading blog index.json:', e);
    }
    return of([]);
  }

  override getBlogPost(slug: string): Observable<BlogPostMeta> {
    const key = makeStateKey<BlogPostMeta>(`blog_post_${slug}`);
    try {
      const filePath = path.join(this.blogDir, `${slug}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const post: BlogPostMeta = JSON.parse(raw);
        this.transferState.set(key, post);
        return of(post);
      }
    } catch (e) {
      console.error(`[ServerBlogService] Error reading blog post ${slug}.json:`, e);
    }
    return super.getBlogPost(slug);
  }
}
