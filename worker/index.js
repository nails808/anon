import {
  ensureSchema,
  findUserByEmail,
  createUser,
  createSession,
  getSession,
  deleteSession,
  savePushSubscription,
  deletePushSubscriptionsForUser,
  getReceipt,
  recordLoginAttempt,
  countRecentFailures,
} from './db.js';
import { hashPassword, verifyPassword, randomToken } from './crypto.js';
import {
  json,
  html,
  withCors,
  badRequest,
  unauthorized,
  notFound,
  serverError,
  getAuthToken,
} from './http.js';
import { handleTelegramWebhook, notifyAdminsNewUser } from './telegram.js';
import { render as renderCommBank } from './receiptTemplates/commbank.js';
import { render as renderWestpac } from './receiptTemplates/westpac.js';
import { render as renderAnz } from './receiptTemplates/anz.js';
import { render as renderNab } from './receiptTemplates/nab.js';
import { render as renderUp } from './receiptTemplates/up.js';

const RECEIPT_RENDERERS = {
  commbank: renderCommBank,
  westpac: renderWestpac,
  anz: renderAnz,
  nab: renderNab,
  up: renderUp,
};

const MAX_FAILURES_EMAIL = 8;
const MAX_FAILURES_IP = 30;
const RATE_WINDOW_MIN = 15;
const GENERIC_AUTH_ERROR = 'Invalid email or password';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    ''
  );
}

function sessionExpirySql(remember) {
  const days = remember ? 30 : 1;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, '')
    .replace('T', ' ');
}

async function requireUser(request, env) {
  const token = getAuthToken(request);
  if (!token) return null;
  return getSession(env, token);
}

async function handleRegister(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const confirm = String(body.passwordConfirm ?? body.confirmPassword ?? body.password_confirmation ?? '');

  if (!isValidEmail(email)) return badRequest('Enter a valid email address');
  if (password.length < 8) return badRequest('Password must be at least 8 characters');
  if (password.length > 128) return badRequest('Password is too long');
  if (!confirm || password !== confirm) return badRequest('Passwords do not match');

  const existing = await findUserByEmail(env, email);
  if (existing) {
    // Same message whether or not email exists for enumeration resistance on register is less critical;
    // still avoid leaking internal ids.
    return badRequest('An account with this email already exists');
  }

  const { hash, salt } = await hashPassword(password);
  let user;
  try {
    user = await createUser(env, email, hash, salt);
  } catch (e) {
    if (String(e?.message || e).toUpperCase().includes('UNIQUE')) {
      return badRequest('An account with this email already exists');
    }
    throw e;
  }

  // Notify only after successful INSERT (duplicate emails never reach here)
  try {
    await notifyAdminsNewUser(env, {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    });
  } catch (e) {
    console.log('notifyAdminsNewUser failed', e);
  }

  const remember = Boolean(body.remember);
  const expiresAt = sessionExpirySql(remember);
  const token = randomToken(32);
  await createSession(env, user.id, token, expiresAt, remember, {
    userAgent: request.headers.get('User-Agent') || '',
    ip: clientIp(request),
  });

  return json(
    {
      ok: true,
      token,
      user: { id: user.id, email: user.email, status: user.status || 'active' },
      expiresAt,
    },
    201
  );
}

async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const remember = Boolean(body.remember);
  const ip = clientIp(request);

  if (!isValidEmail(email) || !password) {
    return badRequest('Email and password are required');
  }

  // Rate limit before touching password verification
  const { emailFailures, ipFailures } = await countRecentFailures(env, email, ip, RATE_WINDOW_MIN);
  if (emailFailures >= MAX_FAILURES_EMAIL || ipFailures >= MAX_FAILURES_IP) {
    return json(
      {
        ok: false,
        error: 'Too many login attempts. Try again in a few minutes.',
      },
      429
    );
  }

  const user = await findUserByEmail(env, email);

  // Constant-ish path: always verify when user exists; always same error on failure
  let passwordOk = false;
  if (user && user.status === 'active') {
    passwordOk = await verifyPassword(password, user.password_hash, user.password_salt);
  } else if (user && user.status !== 'active') {
    await recordLoginAttempt(env, email, ip, false);
    return unauthorized('This account is not available');
  } else {
    // Dummy work to reduce timing oracle (hash a throwaway password)
    try {
      await verifyPassword(password, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', 'AAAAAAAAAAAAAAAAAAAAAA==');
    } catch {
      /* ignore */
    }
  }

  if (!user || !passwordOk) {
    await recordLoginAttempt(env, email, ip, false);
    return unauthorized(GENERIC_AUTH_ERROR);
  }

  await recordLoginAttempt(env, email, ip, true);

  const expiresAt = sessionExpirySql(remember);
  const token = randomToken(32);
  await createSession(env, user.id, token, expiresAt, remember, {
    userAgent: request.headers.get('User-Agent') || '',
    ip,
  });

  return json({
    ok: true,
    token,
    user: { id: user.id, email: user.email, status: user.status },
    expiresAt,
  });
}

async function handleMe(request, env) {
  const session = await requireUser(request, env);
  if (!session) return unauthorized();
  return json({
    ok: true,
    user: { id: session.user_id, email: session.email },
  });
}

async function handleLogout(request, env) {
  const token = getAuthToken(request);
  if (token) await deleteSession(env, token);
  return json({ ok: true });
}

async function handleSubscribe(request, env) {
  // Require authentication — subscriptions are always owned by the session user
  const session = await requireUser(request, env);
  if (!session) return unauthorized('Login required to enable notifications');

  let subscription;
  try {
    subscription = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('https://') ||
    typeof p256dh !== 'string' ||
    typeof auth !== 'string'
  ) {
    return badRequest('Invalid push subscription');
  }

  try {
    await savePushSubscription(env, {
      endpoint,
      p256dh,
      auth,
      userId: session.user_id,
    });
  } catch (e) {
    if (e?.code === 'SUBSCRIPTION_OWNED') {
      return json({ ok: false, error: e.message }, 409);
    }
    throw e;
  }
  return json({ ok: true, status: 'subscribed', linked: true, userId: session.user_id }, 201);
}

async function handleUnsubscribe(request, env) {
  const session = await requireUser(request, env);
  if (!session) return unauthorized('Login required');

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* optional body */
  }
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null;
  await deletePushSubscriptionsForUser(env, session.user_id, endpoint);
  return json({ ok: true, status: 'unsubscribed' });
}

async function handleReceipt(_request, env, id) {
  const row = await getReceipt(env, id);
  if (!row) return html('<h1>Receipt not found</h1>', 404);

  const render = RECEIPT_RENDERERS[row.bank] || RECEIPT_RENDERERS.commbank;
  const page = render({
    id: row.id,
    amount: row.amount,
    sender_name: row.sender_name,
    target_name: row.target_name,
    description: row.description,
    phone: row.phone,
    bank: row.bank,
    created_at: row.created_at,
  });
  return html(page);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return withCors(request, new Response(null, { status: 204 }), env);
    }

    try {
      await ensureSchema(env);
    } catch (e) {
      console.log('ensureSchema', e);
      return withCors(request, serverError('Database unavailable'), env);
    }

    let response;

    try {
      if (path === '/telegram/webhook' && request.method === 'POST') {
        response = await handleTelegramWebhook(request, env);
      } else if (path === '/api/register' && request.method === 'POST') {
        response = await handleRegister(request, env);
      } else if (path === '/api/login' && request.method === 'POST') {
        response = await handleLogin(request, env);
      } else if (path === '/api/me' && request.method === 'GET') {
        response = await handleMe(request, env);
      } else if (path === '/api/logout' && request.method === 'POST') {
        response = await handleLogout(request, env);
      } else if (path === '/api/subscribe' && request.method === 'POST') {
        response = await handleSubscribe(request, env);
      } else if (path === '/api/unsubscribe' && request.method === 'POST') {
        response = await handleUnsubscribe(request, env);
      } else if (path.startsWith('/pay/receipt/') && request.method === 'GET') {
        const id = path.slice('/pay/receipt/'.length);
        response = await handleReceipt(request, env, id);
      } else {
        response = notFound();
      }
    } catch (e) {
      console.log('handler error', e);
      response = serverError(e instanceof Error ? e.message : 'internal error');
    }

    if (path.startsWith('/pay/receipt/')) return response;
    return withCors(request, response, env);
  },
};
