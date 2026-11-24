/**
 * Schema bootstrap + helpers for Anon D1.
 */

export async function ensureSchema(env) {
  if (!env.DB) throw new Error('D1 binding DB is missing');

  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        remember INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        user_agent TEXT,
        ip TEXT
      )
    `),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL COLLATE NOCASE,
        ip TEXT NOT NULL DEFAULT '',
        success INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts(email, created_at)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip, created_at)`),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON push_subscriptions(created_at)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)`),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS pay_receipts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL DEFAULT 0,
        amount TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        target_name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT 'Goods',
        phone TEXT,
        bank TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_pay_receipts_user ON pay_receipts(user_id)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_pay_receipts_created ON pay_receipts(created_at)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_pay_receipts_bank ON pay_receipts(bank)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_pay_receipts_user_created ON pay_receipts(user_id, created_at)`),
  ]);

  // Best-effort column upgrades for older installs
  for (const sql of [
    `ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`,
    `ALTER TABLE sessions ADD COLUMN last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))`,
    `ALTER TABLE sessions ADD COLUMN user_agent TEXT`,
    `ALTER TABLE sessions ADD COLUMN ip TEXT`,
    `ALTER TABLE push_subscriptions ADD COLUMN user_id INTEGER`,
    `ALTER TABLE pay_receipts ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0`,
  ]) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      /* column already exists */
    }
  }
}

export async function findUserByEmail(env, email) {
  return env.DB.prepare(
    `SELECT id, email, password_hash, password_salt, status, created_at
     FROM users WHERE email = ? COLLATE NOCASE`
  )
    .bind(String(email).trim().toLowerCase())
    .first();
}

export async function findUserById(env, id) {
  return env.DB.prepare(
    `SELECT id, email, status, created_at FROM users WHERE id = ?`
  )
    .bind(id)
    .first();
}

export async function createUser(env, email, passwordHash, passwordSalt) {
  return env.DB.prepare(
    `INSERT INTO users (email, password_hash, password_salt, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', datetime('now'), datetime('now'))
     RETURNING id, email, status, created_at`
  )
    .bind(String(email).trim().toLowerCase(), passwordHash, passwordSalt)
    .first();
}

export async function createSession(env, userId, token, expiresAt, remember, meta = {}) {
  await env.DB.prepare(
    `INSERT INTO sessions (token, user_id, expires_at, remember, created_at, last_seen_at, user_agent, ip)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?)`
  )
    .bind(
      token,
      userId,
      expiresAt,
      remember ? 1 : 0,
      meta.userAgent || null,
      meta.ip || null
    )
    .run();
}

export async function getSession(env, token) {
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT s.token, s.user_id, s.expires_at, s.remember, u.email, u.status
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  )
    .bind(token)
    .first();
  if (!row) return null;

  // SQLite stores without timezone; treat as UTC
  const exp = String(row.expires_at).includes('T')
    ? new Date(row.expires_at)
    : new Date(String(row.expires_at).replace(' ', 'T') + 'Z');
  if (Number.isNaN(exp.getTime()) || exp < new Date()) {
    await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
    return null;
  }
  if (row.status && row.status !== 'active') {
    return null;
  }

  // Touch last_seen (fire-and-forget style)
  try {
    await env.DB.prepare(
      `UPDATE sessions SET last_seen_at = datetime('now') WHERE token = ?`
    )
      .bind(token)
      .run();
  } catch {
    /* ignore */
  }

  return row;
}

export async function deleteSession(env, token) {
  if (!token) return;
  await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
}

export async function deleteUserSessions(env, userId) {
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run();
}

export async function recordLoginAttempt(env, email, ip, success) {
  await env.DB.prepare(
    `INSERT INTO login_attempts (email, ip, success, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  )
    .bind(String(email || '').toLowerCase(), String(ip || ''), success ? 1 : 0)
    .run();
}

/** Count failed attempts in the last windowMinutes for email or IP */
export async function countRecentFailures(env, email, ip, windowMinutes = 15) {
  const emailCount = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM login_attempts
     WHERE email = ? COLLATE NOCASE
       AND success = 0
       AND created_at >= datetime('now', ?)`
  )
    .bind(String(email || '').toLowerCase(), `-${windowMinutes} minutes`)
    .first();

  const ipCount = ip
    ? await env.DB.prepare(
        `SELECT COUNT(*) AS c FROM login_attempts
         WHERE ip = ?
           AND success = 0
           AND created_at >= datetime('now', ?)`
      )
        .bind(String(ip), `-${windowMinutes} minutes`)
        .first()
    : { c: 0 };

  return {
    emailFailures: Number(emailCount?.c || 0),
    ipFailures: Number(ipCount?.c || 0),
  };
}

export async function savePushSubscription(env, { endpoint, p256dh, auth, userId }) {
  await env.DB.prepare(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(endpoint) DO UPDATE SET
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       user_id = COALESCE(excluded.user_id, push_subscriptions.user_id),
       updated_at = datetime('now')`
  )
    .bind(endpoint, p256dh, auth, userId ?? null)
    .run();
}

export async function getPushForUser(env, userId) {
  return env.DB.prepare(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`
  )
    .bind(userId)
    .first();
}

/**
 * Insert a validated payment receipt.
 * Expects row produced by createPayReceipt() in receipts.js (or equivalent).
 * Enforces FK: user must exist.
 */
export async function insertReceipt(env, row) {
  if (!row?.id || !row?.user_id) throw new Error('Receipt id and user_id are required');
  if (row.amount_cents == null || row.amount == null) throw new Error('Amount is required');
  if (!row.sender_name || !row.target_name || !row.bank || !row.created_at) {
    throw new Error('Missing required receipt fields');
  }

  const user = await findUserById(env, row.user_id);
  if (!user) throw new Error('Cannot create receipt for nonexistent user');

  await env.DB.prepare(
    `INSERT INTO pay_receipts
      (id, user_id, amount_cents, amount, sender_name, target_name, description, phone, bank, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      row.id,
      row.user_id,
      row.amount_cents,
      row.amount,
      row.sender_name,
      row.target_name,
      row.description || 'Goods',
      row.phone ?? null,
      row.bank,
      row.created_at
    )
    .run();
}

export async function getReceipt(env, id) {
  return env.DB.prepare(
    `SELECT r.*, u.email AS user_email
     FROM pay_receipts r
     JOIN users u ON u.id = r.user_id
     WHERE r.id = ?`
  )
    .bind(id)
    .first();
}


export async function getUserStats(env) {
  const total = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users`
  ).first();
  const active = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE status = 'active'`
  ).first();
  const recent = await env.DB.prepare(
    `SELECT id, email, status, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT 5`
  ).all();
  return {
    total: Number(total?.c || 0),
    active: Number(active?.c || 0),
    recent: recent?.results || [],
  };
}

export async function getUserDetail(env, email) {
  const user = await findUserByEmail(env, email);
  if (!user) return null;
  const push = await env.DB.prepare(
    `SELECT endpoint, updated_at FROM push_subscriptions
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`
  )
    .bind(user.id)
    .first();
  const sessions = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM sessions
     WHERE user_id = ?
       AND expires_at > datetime('now')`
  )
    .bind(user.id)
    .first();
  const receipts = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM pay_receipts WHERE user_id = ?`
  )
    .bind(user.id)
    .first();
  return {
    user,
    hasPush: Boolean(push),
    pushUpdatedAt: push?.updated_at || null,
    activeSessions: Number(sessions?.c || 0),
    receiptCount: Number(receipts?.c || 0),
  };
}
