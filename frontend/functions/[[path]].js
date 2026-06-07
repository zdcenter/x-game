export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Attempt to fetch the static asset
  const response = await env.ASSETS.fetch(request);

  // If the asset exists and is not a 404, return it directly
  if (response.status !== 404) {
    return response;
  }

  // If the request is for a 404 and starts with /zh/, return the Chinese SPA index
  if (url.pathname.startsWith('/zh/')) {
    return env.ASSETS.fetch(new Request(new URL('/zh/index.html', request.url)));
  }
  
  // If the request is for a 404 and starts with /en/, return the English SPA index
  if (url.pathname.startsWith('/en/')) {
    return env.ASSETS.fetch(new Request(new URL('/en/index.html', request.url)));
  }

  // For any other 404s (e.g., /lobby), fall back to the root index.html (which handles language sniffing)
  return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
}
