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
    const isZh = acceptLang.toLowerCase().startsWith('zh');
    // Use 301 for English (Googlebot default) so it's treated as canonical,
    // 302 for Chinese (language-based, may vary per user).
    const code = isZh ? 302 : 301;
    const lang = isZh ? 'zh' : 'en';
    return Response.redirect(new URL(`/${lang}/lobby`, request.url).toString(), code);
  }

  // Language root paths (/en, /en/, /zh, /zh/) — redirect server-side so Googlebot
  // receives a proper 301/302 rather than a JS-only client-side Angular redirect.
  if (pathname === '/en' || pathname === '/en/') {
    return Response.redirect(new URL('/en/lobby', request.url).toString(), 301);
  }
  if (pathname === '/zh' || pathname === '/zh/') {
    return Response.redirect(new URL('/zh/lobby', request.url).toString(), 302);
  }

  // Serve prerendered page via explicit index.html path.
  // Avoids 301 trailing-slash redirects that env.ASSETS.fetch emits for bare directory paths,
  // which would cause a redirect loop (/zh/lobby → 301 → /zh/lobby/ → 301 → ...).
  const cleanPath = pathname.replace(/\/+$/, '');
  const prerendered = await env.ASSETS.fetch(new Request(new URL(cleanPath + '/index.html', request.url)));
  if (prerendered.status === 404) {
    // SPA fallback: Angular app shell handles client-side routing (blog, admin, unknown paths).
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
  }

  // Fix Link header: Cloudflare converts <link rel="modulepreload" href="chunk-X.js"> to HTTP
  // Link headers using the relative href as-is. Browsers resolve these relative to the request
  // URL (e.g. /zh/lobby/chunk-X.js) instead of <base href="/">, causing MIME type errors.
  // Solution: rewrite relative paths to absolute (prepend /).
  const linkHeader = prerendered.headers.get('Link');
  if (!linkHeader) return prerendered;

  const fixedLink = linkHeader.replace(/<([^/h][^>]*)>/g, '</$1>');
  const headers = new Headers(prerendered.headers);
  headers.set('Link', fixedLink);
  return new Response(prerendered.body, { status: prerendered.status, headers });
}
