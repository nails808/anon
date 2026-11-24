const CORS_BASE = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_BASE,
      ...extraHeaders,
    },
  });
}

export function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function withCors(request, response, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.APP_ORIGIN || '*';
  const headers = new Headers(response.headers);
  if (allowed === '*' || origin === allowed) {
    headers.set('Access-Control-Allow-Origin', allowed === '*' ? origin || '*' : allowed);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  for (const [k, v] of Object.entries(CORS_BASE)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export function badRequest(msg) {
  return json({ ok: false, error: msg }, 400);
}

export function unauthorized(msg = 'Unauthorized') {
  return json({ ok: false, error: msg }, 401);
}

export function forbidden(msg = 'Forbidden') {
  return json({ ok: false, error: msg }, 403);
}

export function notFound(msg = 'Not found') {
  return json({ ok: false, error: msg }, 404);
}

export function serverError(msg = 'Internal error') {
  return json({ ok: false, error: msg }, 500);
}

/** Extract Bearer token or X-Session-Token header */
export function getAuthToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return (request.headers.get('X-Session-Token') || '').trim() || null;
}
