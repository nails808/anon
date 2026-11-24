/**
 * Web Push (VAPID) sender for Cloudflare Workers.
 * Requires env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY (JWK JSON preferred), env.VAPID_SUBJECT.
 *
 * Successful delivery is NOT proof of payment — these are internal app records only.
 */

import { deletePushSubscription } from './db.js';

function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function uint8ArrayToBase64Url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importVapidPrivateKey(env) {
  const raw = String(env.VAPID_PRIVATE_KEY || '').trim();
  if (!raw) throw new Error('VAPID_PRIVATE_KEY is not set');

  if (raw.startsWith('{')) {
    const jwk = JSON.parse(raw);
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }

  const keyData = base64UrlToUint8Array(raw);
  return crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

async function createVapidJwt(env, audience) {
  const privateKey = await importVapidPrivateKey(env);
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT || 'mailto:admin@anon.local',
  };

  const enc = new TextEncoder();
  const headerB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(enc.encode(JSON.stringify(payload)));
  const data = enc.encode(`${headerB64}.${payloadB64}`);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);
  const sigB64 = uint8ArrayToBase64Url(new Uint8Array(sig));
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

/**
 * Build standard payment-record notification payload.
 */
export function buildPaymentPushPayload({ bank, receipt, receiptUrl }) {
  let body = `Payment record created: $${receipt.amount} to ${receipt.target_name}`;
  if (receipt.phone) body += `\n${receipt.phone}`;

  return {
    title: `${bank.display} — Internal Record`,
    body,
    icon: bank.icon || '/icons/commbank.png',
    badge: '/shield.svg',
    url: receiptUrl,
    data: {
      url: receiptUrl,
      receiptId: receipt.id,
      createdAt: receipt.created_at,
      kind: 'pay_receipt',
    },
  };
}

/**
 * Send a push notification to a single subscription.
 * On 404/410, deletes the stored subscription row.
 */
export async function sendWebPush(env, sub, payload) {
  if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) {
    return { ok: false, error: 'Invalid subscription' };
  }
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return { ok: false, error: 'VAPID keys not configured' };
  }

  const endpointUrl = new URL(sub.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const jwt = await createVapidJwt(env, audience);

  const body = JSON.stringify({
    title: payload.title || 'Anon',
    body: payload.body || '',
    icon: payload.icon || '/shield.svg',
    badge: payload.badge || '/shield.svg',
    url: payload.url || payload.data?.url || '/',
    data: {
      url: payload.url || payload.data?.url || '/',
      ...(payload.data || {}),
    },
  });

  const headers = {
    Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
    'Content-Type': 'application/json',
    TTL: '86400',
    Urgency: 'high',
  };

  try {
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers,
      body,
    });

    // Gone / Not Found → drop invalid subscription
    if (res.status === 404 || res.status === 410) {
      try {
        await deletePushSubscription(env, sub.endpoint);
      } catch (e) {
        console.log('deletePushSubscription failed', e);
      }
      return {
        ok: false,
        status: res.status,
        error: 'Subscription expired or invalid (removed)',
        removed: true,
      };
    }

    if (res.status === 201 || res.status === 200 || res.status === 204) {
      return { ok: true, status: res.status };
    }

    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: text.slice(0, 200) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'push failed' };
  }
}
