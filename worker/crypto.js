/** Password hashing + random tokens using Web Crypto (Workers runtime). */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function bufToB64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BYTES * 8
  );
  return {
    hash: bufToB64(derived),
    salt: bufToB64(salt),
  };
}

export async function verifyPassword(password, storedHashB64, storedSaltB64) {
  const salt = b64ToBuf(storedSaltB64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BYTES * 8
  );
  const candidate = bufToB64(derived);
  return candidate === storedHashB64;
}

/**
 * Unique receipt id: N followed by digits only.
 * Combines time + random so concurrent inserts do not collide.
 */
export function makeReceiptId() {
  const time = Date.now().toString();
  const rand = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  const digits = `${time}${String(rand).padStart(6, '0')}`;
  return `N${digits}`;
}
