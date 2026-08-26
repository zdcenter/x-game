export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Static files (JS, CSS, images, etc.) — serve directly
    const lastSegment = pathname.split('/').pop();
    if (lastSegment && lastSegment.includes('.')) {
      const response = await env.ASSETS.fetch(request);
      
      // Cloudflare Pages SPA fallback returns 200 text/html for missing assets.
      // Intercept this to prevent MIME type errors and force the client to reload and fetch the latest build.
      const isHtmlFallback = response.status === 200 && response.headers.get('content-type')?.includes('text/html');
      
      if (response.status === 404 || isHtmlFallback) {
        if (pathname.endsWith('.js')) {
          return new Response("window.location.reload(true);", {
            headers: { 
              "Content-Type": "application/javascript",
              "Cache-Control": "no-cache, no-store, must-revalidate"
            }
          });
        }
        return new Response('Not Found', { status: 404 });
      }
      
      return response;
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

    // Legacy /pages/* links (old footer links) — consolidate on the canonical
    // prerendered /legal/* URLs so crawlers never hit the empty SPA fallback.
    if (pathname.includes('/pages/')) {
      return Response.redirect(new URL(pathname.replace('/pages/', '/legal/'), request.url).toString(), 301);
    }

    // Serve prerendered page via explicit index.html path.
    // Avoids 301 trailing-slash redirects that env.ASSETS.fetch emits for bare directory paths,
    // which would cause a redirect loop (/zh/lobby → 301 → /zh/lobby/ → 301 → ...).
    const cleanPath = pathname.replace(/\/+$/, '');

    // NOTE: Cloudflare Pages ASSETS.fetch NEVER returns 404 for a missing path —
    // it answers 200 with the SPA fallback shell (/index.html) instead. So we
    // cannot detect missing pages via status === 404. Probe the bare path with
    // redirects disabled: real prerendered directories answer 301 (trailing-slash
    // redirect), missing paths answer 200 text/html (the fallback shell).
    const probe = await env.ASSETS.fetch(
      new Request(new URL(cleanPath, request.url), { redirect: 'manual' })
    );
    const isMissing =
      probe.status !== 301 && probe.status !== 302;

    let response;
    if (!isMissing) {
      // Existing prerendered page — serve its index.html directly.
      response = await env.ASSETS.fetch(new Request(new URL(cleanPath + '/index.html', request.url)));
    } else {
      // Soft-404 prevention: only client-side-only Angular routes (auth / profile /
      // admin) legitimately need the app shell. Everything else that is not
      // prerendered is a genuine 404 — returning 200 with the lobby shell here
      // would create soft-404s that hurt Google crawl quality.
      const langPrefix = pathname.match(/^\/(en|zh|es|ja|ko|pt|fr|de)\//)?.[0] || '/';
      const rel = pathname.slice(langPrefix.length);
      const isClientRoute =
        rel === 'login' || rel === 'register' || rel === 'profile' ||
        rel === 'admin' || rel.startsWith('admin/');
      if (!isClientRoute) {
        return new Response(
          '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>404 Not Found - Puzzle PK</title></head>' +
          '<body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
          '<div style="text-align:center"><h1 style="font-size:3rem;margin:0">404</h1>' +
          '<p>The page you are looking for does not exist.</p>' +
          '<a href="/en/lobby" style="color:#38bdf8">← Back to Puzzle PK</a></div></body></html>',
          {
            status: 404,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=300',
            },
          }
        );
      }
      // SPA fallback: Angular app shell handles client-side routing (login, admin, profile).
      response = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
    }

    // Fix Link header: Cloudflare converts <link rel="modulepreload" href="chunk-X.js"> to HTTP
    // Link headers using the relative href as-is. Browsers resolve these relative to the request
    // URL (e.g. /zh/lobby/chunk-X.js) instead of <base href="/">, causing MIME type errors.
    // Solution: rewrite relative paths to absolute (prepend /).
    const linkHeader = response.headers.get('Link');
    if (!linkHeader) return response;

    const fixedLink = linkHeader.replace(/<([^/h][^>]*)>/g, '</$1>');
    const headers = new Headers(response.headers);
    headers.set('Link', fixedLink);
    
    // Cloudflare Pages requires body to be null if status is 304, but response.body might be a stream that we shouldn't pass
    const body = [204, 205, 304].includes(response.status) ? null : response.body;
    return new Response(body, { status: response.status, headers });
  } catch (err) {
    return new Response(err.stack || err.message, { status: 500 });
  }
}
