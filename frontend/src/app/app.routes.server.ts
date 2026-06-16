import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Blog routes are DB-backed — render server-side dynamically
  { path: 'blog',     renderMode: RenderMode.Server },
  { path: 'blog/:id', renderMode: RenderMode.Server },
  // All other routes prerendered at build time
  { path: '**', renderMode: RenderMode.Prerender },
];
