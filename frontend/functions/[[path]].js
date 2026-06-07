export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check if it's a static file (has an extension like .js, .css, .png, etc.)
  // We consider it a static file if the last segment contains a dot.
  const lastSegment = pathname.split('/').pop();
  const isStaticFile = lastSegment && lastSegment.includes('.');

  if (!isStaticFile) {
    // It's a route (e.g. /zh/lobby). 
    // We MUST bypass env.ASSETS.fetch(request) here because Cloudflare's 
    // automatic SPA routing might intercept the 404 and return the wrong index.html.
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
