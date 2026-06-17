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

  // Serve prerendered page via explicit index.html path.
  // Avoids 301 trailing-slash redirects that env.ASSETS.fetch emits for bare directory paths,
  // which would cause a redirect loop (/zh/lobby → 301 → /zh/lobby/ → 301 → ...).
  const cleanPath = pathname.replace(/\/+$/, '');
  const prerendered = await env.ASSETS.fetch(new Request(new URL(cleanPath + '/index.html', request.url)));
  if (prerendered.status !== 404) return prerendered;

  // SPA fallback: Angular app shell handles client-side routing (blog, admin, unknown paths).
  return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
}
