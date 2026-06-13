export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Rewrite shared assets: point /assets/* directly to /en/assets/*
  if (pathname.startsWith('/assets/')) {
    return env.ASSETS.fetch(new Request(new URL('/en' + pathname, request.url)));
  }

  // Check if it's a static file (has an extension like .js, .css, .png, etc.)
  // We consider it a static file if the last segment contains a dot.
  const lastSegment = pathname.split('/').pop();
  const isStaticFile = lastSegment && lastSegment.includes('.');

  if (!isStaticFile) {
    // Try to fetch the requested path first. Cloudflare's Clean URLs will 
    // automatically map /zh/lobby to /zh/lobby.html if it exists.
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) {
      return res;
    }

    // It's a route that doesn't exist statically (e.g. dynamic route).
    // Apply language-specific SPA fallback.
    if (pathname.startsWith('/zh/')) {
      return env.ASSETS.fetch(new Request(new URL('/zh/index.html', request.url)));
    }
    if (pathname.startsWith('/en/')) {
      return env.ASSETS.fetch(new Request(new URL('/en/index.html', request.url)));
    }
    // For root or other routes, serve the root language-sniffing index.html
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
  }

  // It's a static file request. Fetch it directly.
  return env.ASSETS.fetch(request);
}
