import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Blog routes are DB-backed — render server-side (or SPA client-side on Cloudflare Pages)
  { path: 'zh/blog',     renderMode: RenderMode.Server },
  { path: 'zh/blog/:id', renderMode: RenderMode.Server },
  { path: 'en/blog',     renderMode: RenderMode.Server },
  { path: 'en/blog/:id', renderMode: RenderMode.Server },
  // Everything else: prerendered at build time (routes.txt drives the list)
  { path: '**', renderMode: RenderMode.Prerender },
];
