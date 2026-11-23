const corsHeaders = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/subscribe') return json({ error: 'Not found' }, 404);

    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      if (env.APP_ORIGIN && origin !== env.APP_ORIGIN) return json({ error: 'Origin not allowed' }, 403);
      return new Response(null, { status: 204, headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin || '*' } });
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const origin = request.headers.get('Origin');
    if (env.APP_ORIGIN && origin !== env.APP_ORIGIN) return json({ error: 'Origin not allowed' }, 403);

    let subscription;
    try { subscription = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') ||
        typeof p256dh !== 'string' || typeof auth !== 'string') {
      return json({ error: 'Invalid push subscription' }, 400);
    }

    try {
      await env.DB.prepare(`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(endpoint) DO UPDATE SET
          p256dh = excluded.p256dh,
          auth = excluded.auth,
          updated_at = datetime('now')
      `).bind(endpoint, p256dh, auth).run();
      return json({ ok: true, status: 'subscribed' }, 201);
    } catch (error) {
      return json({ error: 'Could not save subscription' }, 500);
    }
  }
};
