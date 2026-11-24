/**
 * Web Push sender with full RFC 8291 aes128gcm payload encryption + VAPID (RFC 8292).
 * Cloudflare Workers / Web Crypto only — no npm deps.
 *
 * Env: VAPID_PUBLIC_KEY (base64url), VAPID_PRIVATE_KEY (JWK JSON or PKCS8 base64url),
 *      VAPID_SUBJECT (mailto:...)
 *
 * Successful delivery is NOT proof of payment — internal app records only.
 */

import { deletePushSubscription } from './db.js';

/* ── encoding helpers ──────────────────────────────────── */

function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (String(base64Url) + padding).replace(/-/g, '+').replace(/_/g, '/');
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

function concatBytes(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function writeUint32BE(value) {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value, false);
  return buf;
}

/* ── VAPID (RFC 8292) ──────────────────────────────────── */

async function importVapidPrivateKey(env) {
  const raw = String(env.VAPID_PRIVATE_KEY || '').trim();
  if (!raw) throw new Error('VAPID_PRIVATE_KEY is not set');

  if (raw.startsWith('{')) {
    const jwk = JSON.parse(raw);
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
      'sign',
    ]);
  }

  return crypto.subtle.importKey(
    'pkcs8',
    base64UrlToUint8Array(raw),
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
  return `${headerB64}.${payloadB64}.${uint8ArrayToBase64Url(new Uint8Array(sig))}`;
}

/* ── RFC 8291 aes128gcm ────────────────────────────────── */

/**
 * HKDF-SHA-256 extract+expand via Web Crypto.
 * @param {Uint8Array} salt
 * @param {Uint8Array} ikm
 * @param {Uint8Array} info
 * @param {number} length
 */
async function hkdf(salt, ikm, info, length) {
  const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey,
    length * 8
  );
  return new Uint8Array(bits);
}

/**
 * Encrypt plaintext for a Web Push subscription (Content-Encoding: aes128gcm).
 * @param {{ p256dh: string, auth: string }} sub  base64url client keys
 * @param {Uint8Array} plaintext
 * @returns {Promise<Uint8Array>} full body ready to POST
 */
async function encryptAes128Gcm(sub, plaintext) {
  const clientPublicRaw = base64UrlToUint8Array(sub.p256dh);
  const clientAuth = base64UrlToUint8Array(sub.auth);

  if (clientPublicRaw.length !== 65 || clientPublicRaw[0] !== 0x04) {
    throw new Error('Invalid client p256dh (expected uncompressed P-256 public key)');
  }
  if (clientAuth.length !== 16) {
    throw new Error('Invalid client auth secret (expected 16 bytes)');
  }

  // Ephemeral application-server ECDH key pair
  const asKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ]);

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, asKeyPair.privateKey, 256)
  );

  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));
  // Uncompressed point must be 65 bytes starting with 0x04
  if (asPublicRaw.length !== 65) {
    throw new Error('Unexpected local ECDH public key length');
  }

  // IKM = HKDF-Extract/Expand with auth as salt
  // info = "WebPush: info" || 0x00 || ua_public || as_public
  const infoLabel = new TextEncoder().encode('WebPush: info');
  const ikmInfo = concatBytes(infoLabel, new Uint8Array([0]), clientPublicRaw, asPublicRaw);
  const ikm = await hkdf(clientAuth, sharedSecret, ikmInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Padding: RFC 8291 — append delimiter 0x02 then zero padding (minimum one byte 0x02)
  const padded = concatBytes(plaintext, new Uint8Array([0x02]));

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, padded)
  );

  // Body: salt (16) || rs (4) || idlen (1) || keyid (65) || ciphertext+tag
  const recordSize = 4096;
  return concatBytes(
    salt,
    writeUint32BE(recordSize),
    new Uint8Array([asPublicRaw.length]),
    asPublicRaw,
    encrypted
  );
}

/* ── public API ────────────────────────────────────────── */

/**
 * Build standard payment-record notification JSON (before encryption).
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
 * Send an encrypted Web Push notification to a single subscription.
 * On 404/410, deletes the stored subscription row.
 *
 * @param {object} env
 * @param {{ endpoint: string, p256dh: string, auth: string }} sub
 * @param {{ title: string, body: string, icon?: string, badge?: string, url?: string, data?: object }} payload
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

  let jwt;
  try {
    jwt = await createVapidJwt(env, audience);
  } catch (e) {
    return { ok: false, error: `VAPID sign failed: ${e instanceof Error ? e.message : e}` };
  }

  const notification = {
    title: payload.title || 'Anon',
    body: payload.body || '',
    icon: payload.icon || '/shield.svg',
    badge: payload.badge || '/shield.svg',
    url: payload.url || payload.data?.url || '/',
    data: {
      url: payload.url || payload.data?.url || '/',
      ...(payload.data || {}),
    },
  };

  const plaintext = new TextEncoder().encode(JSON.stringify(notification));

  let body;
  try {
    body = await encryptAes128Gcm(sub, plaintext);
  } catch (e) {
    return { ok: false, error: `Encrypt failed: ${e instanceof Error ? e.message : e}` };
  }

  const headers = {
    Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: '86400',
    Urgency: 'high',
  };

  try {
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers,
      body,
    });

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
      return { ok: true, status: res.status, encoding: 'aes128gcm' };
    }

    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: text.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'push failed' };
  }
}
