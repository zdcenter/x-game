export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Static files (JS, CSS, images, etc.) — serve directly
  const lastSegment = pathname.split('/').pop();
  if (lastSegment && lastSegment.includes('.')) {
    return env.ASSETS.fetch(request);
  }

  // Root: detect browser language via Accept-Language header (server-side, bot-friendly)
  if (pathname === '/') {
    const acceptLang = request.headers.get('Accept-Language') ?? '';
    const lang = acceptLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    return Response.redirect(new URL(`/${lang}/lobby`, request.url).toString(), 302);
  }

  // Try the exact prerendered path (Cloudflare uses Clean URLs, maps /zh/lobby → /zh/lobby/index.html)
  const res = await env.ASSETS.fetch(request);
  if (res.status !== 404) return res;

  // Try explicit directory index (e.g. /zh/lobby/index.html)
  const dirIndex = pathname.endsWith('/') ? pathname + 'index.html' : pathname + '/index.html';
  const dirRes = await env.ASSETS.fetch(new Request(new URL(dirIndex, request.url)));
  if (dirRes.status !== 404) return dirRes;

  // SPA fallback: serve the Angular app shell.
  // The router will handle the route client-side (blog, admin, unknown paths, etc.)
  // index.html is the single-build app shell; Angular bootstraps and navigates to the URL.
  return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
}
