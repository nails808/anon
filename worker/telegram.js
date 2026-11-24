/**
 * Telegram admin bot — registry-based command handlers.
 *
 * Secrets (TELEGRAM_* preferred; legacy BOT_* accepted):
 *   TELEGRAM_BOT_TOKEN | BOT_TOKEN
 *   TELEGRAM_ADMIN_ID  | ADMIN_IDS
 *   TELEGRAM_WEBHOOK_SECRET | BOT_SECRET
 */
import {
  ensureSchema,
  findUserByEmail,
  getPushForUser,
  getUserStats,
  getUserDetail,
} from './db.js';
import { sendWebPush, buildPaymentPushPayload } from './push.js';
import { json } from './http.js';
import { createPayReceipt } from './receipts.js';
import { resolveBank, BANK_KEYS } from './banks.js';

/* ── env helpers ───────────────────────────────────────── */

function botToken(env) {
  return String(env.TELEGRAM_BOT_TOKEN || env.BOT_TOKEN || '').trim();
}

function webhookSecret(env) {
  return String(env.TELEGRAM_WEBHOOK_SECRET || env.BOT_SECRET || '').trim();
}

function adminIds(env) {
  const raw = env.TELEGRAM_ADMIN_ID || env.ADMIN_IDS || '';
  return String(raw)
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAdmin(env, fromId) {
  if (fromId == null) return false;
  return adminIds(env).includes(String(fromId));
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function logAdmin(action, detail = {}) {
  console.log(
    JSON.stringify({
      type: 'admin_action',
      action,
      at: new Date().toISOString(),
      ...detail,
    })
  );
}

export async function telegramSend(env, chatId, text) {
  const token = botToken(env);
  if (!token) {
    console.log('telegramSend: TELEGRAM_BOT_TOKEN missing');
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN missing' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: String(text).slice(0, 4000),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      console.log('telegramSend failed', res.status, data);
      return { ok: false, error: data.description || String(res.status) };
    }
    return { ok: true };
  } catch (e) {
    console.log('telegramSend exception', e);
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
  }
}

/**
 * Notify admins after a user row was successfully inserted.
 */
export async function notifyAdminsNewUser(env, user) {
  const token = botToken(env);
  const ids = adminIds(env);
  if (!token || !ids.length) {
    console.log('notifyAdminsNewUser skipped: bot token or admin id not configured');
    return;
  }

  const email = user?.email || '';
  const userId = user?.id ?? '';
  let created = user?.created_at || new Date().toISOString();
  try {
    const d = String(created).includes('T')
      ? new Date(created)
      : new Date(String(created).replace(' ', 'T') + 'Z');
    if (!Number.isNaN(d.getTime())) {
      created = d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
    }
  } catch {
    /* keep raw */
  }

  const text =
    `<b>NEW USER REGISTERED</b>\n\n` +
    `Username: <code>${escapeHtml(email)}</code>\n` +
    `User ID: <code>${escapeHtml(userId)}</code>\n` +
    `Created: ${escapeHtml(created)}`;

  logAdmin('new_user_notify', { userId, email });
  await Promise.all(ids.map((id) => telegramSend(env, id, text)));
}

/* ── flag / arg parsing ────────────────────────────────── */

/**
 * Parse -/flag values without naive space-splitting.
 * Supports:
 *   -d "quoted value with spaces"
 *   -d 'quoted value'
 *   -d unquoted multi word until next -<letter> flag or end
 */
function parseFlags(text) {
  const flags = {};
  // Drop the leading command token
  const body = String(text || '').replace(/^\s*\/\S+\s*/, '');
  const re = /-([a-zA-Z])(?:\s+|$)/g;
  const hits = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    hits.push({ key: m[1].toLowerCase(), index: m.index, end: m.index + m[0].length });
  }
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].end;
    const stop = i + 1 < hits.length ? hits[i + 1].index : body.length;
    let raw = body.slice(start, stop).trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) ||
      (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2)
    ) {
      raw = raw.slice(1, -1);
    }
    flags[hits[i].key] = raw.trim();
  }
  return flags;
}

function isValidPhone(phone) {
  const s = String(phone || '').trim();
  if (!s) return false;
  // Allow +, digits, spaces, dashes, parentheses; 8–20 digits total
  if (!/^[+0-9()\-\s]+$/.test(s)) return false;
  const digits = s.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function formatDate(raw) {
  if (!raw) return '—';
  try {
    const d = String(raw).includes('T')
      ? new Date(raw)
      : new Date(String(raw).replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  } catch {
    return String(raw);
  }
}

/* banks imported from ./banks.js */

const PAYID_USAGE =
  `<code>/payid -b &lt;bank&gt; -u &lt;user&gt; -a &lt;amount&gt; -n &lt;name&gt; -t &lt;target&gt; [-d &lt;description&gt;] [-p &lt;phone&gt;]</code>\n` +
  `Banks: commbank (cba), westpac, anz, nab, up\n` +
  `Required: -b -u -a -n -t · Optional: -d (default Goods), -p`;

/* ── command registry ────────────────────────────────────
 * Each handler: async (ctx) => void
 * ctx: { env, chatId, fromId, text, args, flags, isAdmin }
 * Register via COMMANDS.set(name, { admin, description, usage, handler })
 * ──────────────────────────────────────────────────────── */

/** @type {Map<string, { admin: boolean, description: string, usage?: string, handler: Function }>} */
const COMMANDS = new Map();

function registerCommand(name, def) {
  const key = name.startsWith('/') ? name.toLowerCase() : `/${name.toLowerCase()}`;
  COMMANDS.set(key, def);
}

async function dispatchCommand(ctx) {
  const parts = ctx.text.split(/\s+/);
  const raw = parts[0].split('@')[0].toLowerCase();
  const entry = COMMANDS.get(raw);

  if (!entry) {
    if (ctx.isAdmin && raw.startsWith('/')) {
      await telegramSend(ctx.env, ctx.chatId, `Unknown command <code>${escapeHtml(raw)}</code>. Try /help`);
      logAdmin('unknown_cmd', { fromId: ctx.fromId, cmd: raw });
    }
    return { handled: Boolean(entry) };
  }

  if (entry.admin && !ctx.isAdmin) {
    logAdmin('denied', { fromId: ctx.fromId, cmd: raw, chatId: ctx.chatId });
    await telegramSend(ctx.env, ctx.chatId, '⛔ Access denied. Admin only.');
    return { handled: true };
  }

  ctx.args = parts.slice(1);
  ctx.flags = parseFlags(ctx.text);
  await entry.handler(ctx);
  return { handled: true };
}

function buildHelpText() {
  const lines = ['<b>Anon admin bot</b>', '', 'Commands:'];
  for (const [name, def] of COMMANDS.entries()) {
    const badge = def.admin ? ' <i>(admin)</i>' : '';
    lines.push(`• <code>${name}</code>${badge} — ${def.description}`);
    if (def.usage) lines.push(`  ${def.usage}`);
  }
  lines.push('', 'Only the configured Telegram administrator may run admin commands.');
  return lines.join('\n');
}

/* ── handlers ──────────────────────────────────────────── */

registerCommand('/start', {
  admin: false,
  description: 'Show available commands and admin access',
  async handler(ctx) {
    if (ctx.isAdmin) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        buildHelpText() + '\n\nYou are recognised as an administrator.'
      );
    } else {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        '<b>Anon bot</b>\n\n' +
          'This bot is an administrative interface for the Anon PWA.\n' +
          'You are not authorised to run admin commands.\n\n' +
          'Public: /start · /whoami · /help'
      );
    }
    logAdmin('start', { fromId: ctx.fromId, admin: ctx.isAdmin });
  },
});

registerCommand('/help', {
  admin: false,
  description: 'Command documentation and usage examples',
  async handler(ctx) {
    // Non-admins get a short public summary; admins get full docs
    if (!ctx.isAdmin) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        '<b>Help</b>\n\n' +
          'Public commands: /start, /help, /whoami\n' +
          'Administrative commands require the configured admin Telegram ID.'
      );
      return;
    }
    await telegramSend(ctx.env, ctx.chatId, buildHelpText());
    logAdmin('help', { fromId: ctx.fromId });
  },
});

registerCommand('/whoami', {
  admin: false,
  description: 'Show your Telegram user id',
  async handler(ctx) {
    await telegramSend(
      ctx.env,
      ctx.chatId,
      `Your Telegram user id: <code>${escapeHtml(ctx.fromId)}</code>\n` +
        `Admin: ${ctx.isAdmin ? 'yes' : 'no'}`
    );
  },
});

registerCommand('/status', {
  admin: true,
  description: 'Bot and configuration health',
  async handler(ctx) {
    await telegramSend(
      ctx.env,
      ctx.chatId,
      `<b>Status</b>\n` +
        `Bot token: ${botToken(ctx.env) ? 'configured' : 'missing'}\n` +
        `Admins configured: ${adminIds(ctx.env).length}\n` +
        `Webhook secret: ${webhookSecret(ctx.env) ? 'configured' : 'not set'}\n` +
        `Time: ${new Date().toISOString()}`
    );
    logAdmin('status', { fromId: ctx.fromId });
  },
});

registerCommand('/users', {
  admin: true,
  description: 'Account statistics and recent registrations',
  async handler(ctx) {
    const stats = await getUserStats(ctx.env);
    const lines = [
      '<b>Users</b>',
      `Total registered: <b>${stats.total}</b>`,
      `Active: <b>${stats.active}</b>`,
      '',
      '<b>Most recent</b>',
    ];
    if (!stats.recent.length) {
      lines.push('No users yet.');
    } else {
      for (const u of stats.recent) {
        lines.push(
          `• <code>${escapeHtml(u.email)}</code> · id ${u.id} · ${formatDate(u.created_at)} · ${escapeHtml(u.status || 'active')}`
        );
      }
    }
    await telegramSend(ctx.env, ctx.chatId, lines.join('\n'));
    logAdmin('users', { fromId: ctx.fromId, total: stats.total });
  },
});

registerCommand('/user', {
  admin: true,
  description: 'Look up an account by email',
  usage: '<code>/user -u email@example.com</code>',
  async handler(ctx) {
    const email = (ctx.flags.u || ctx.args[0] || '').trim();
    if (!email) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        '❌ Missing email.\nUsage: <code>/user -u email@example.com</code>'
      );
      return;
    }
    if (!isValidEmail(email)) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        `❌ Invalid email address: <code>${escapeHtml(email)}</code>`
      );
      return;
    }

    const detail = await getUserDetail(ctx.env, email);
    if (!detail) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        `❌ No account found for <code>${escapeHtml(email)}</code>`
      );
      logAdmin('user_lookup_miss', { fromId: ctx.fromId, email });
      return;
    }

    const { user, hasPush, pushUpdatedAt, activeSessions, receiptCount } = detail;
    const text =
      `<b>User</b>\n` +
      `Email: <code>${escapeHtml(user.email)}</code>\n` +
      `ID: <code>${user.id}</code>\n` +
      `Status: ${escapeHtml(user.status || 'active')}\n` +
      `Created: ${formatDate(user.created_at)}\n` +
      `Active sessions: ${activeSessions}\n` +
      `Push subscription: ${hasPush ? 'yes' : 'no'}` +
      (pushUpdatedAt ? ` (updated ${formatDate(pushUpdatedAt)})` : '') +
      `\nReceipts: ${receiptCount}`;

    await telegramSend(ctx.env, ctx.chatId, text);
    logAdmin('user_lookup', { fromId: ctx.fromId, userId: user.id, email: user.email });
  },
});

registerCommand('/payid', {
  admin: true,
  description: 'Create a payment receipt and send Web Push',
  usage: PAYID_USAGE,
  async handler(ctx) {
    const USAGE =
      `Usage:\n` +
      `<code>/payid -b bank -u email -a amount -n "sender" -t "recipient" [-d "description"] [-p phone]</code>\n\n` +
      `Banks: ${BANK_KEYS.join(', ')} (alias cba → commbank)\n` +
      `Required: -b -u -a -n -t\n` +
      `Optional: -d (default Goods), -p\n` +
      `Tip: quote values that contain spaces, e.g. -d "Home repairs"`;

    const flags = ctx.flags;
    const missing = [];
    if (!flags.b) missing.push('-b (bank)');
    if (!flags.u) missing.push('-u (user email)');
    if (!flags.a) missing.push('-a (amount)');
    if (!flags.n) missing.push('-n (sender name)');
    if (!flags.t) missing.push('-t (recipient name)');

    if (missing.length) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        `❌ Missing required flags: ${missing.join(', ')}\n\n${USAGE}`
      );
      logAdmin('payid_invalid', { fromId: ctx.fromId, missing });
      return;
    }

    if (!isValidEmail(flags.u)) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        `❌ Invalid user email: <code>${escapeHtml(flags.u)}</code>\n\n${USAGE}`
      );
      return;
    }

    if (!resolveBank(flags.b)) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        `❌ Unknown bank <code>${escapeHtml(flags.b)}</code>.\nAllowed: ${BANK_KEYS.join(', ')}\n\n${USAGE}`
      );
      logAdmin('payid_bad_bank', { fromId: ctx.fromId, bank: flags.b });
      return;
    }

    if (flags.p && !isValidPhone(flags.p)) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        `❌ Invalid phone number: <code>${escapeHtml(flags.p)}</code>\nUse 8–15 digits (spaces, +, dashes allowed).`
      );
      return;
    }

    // Resolve user + require push BEFORE any DB write
    const user = await findUserByEmail(ctx.env, flags.u);
    if (!user) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        `❌ No app user found for <code>${escapeHtml(flags.u)}</code>.`
      );
      logAdmin('payid_user_missing', { fromId: ctx.fromId, email: flags.u });
      return;
    }

    const sub = await getPushForUser(ctx.env, user.id);
    if (!sub) {
      await telegramSend(
        ctx.env,
        ctx.chatId,
        `❌ User <code>${escapeHtml(user.email)}</code> has no active Web Push subscription.\n` +
          `Ask them to open the app and enable notifications before issuing a receipt.`
      );
      logAdmin('payid_no_push', { fromId: ctx.fromId, userId: user.id });
      return;
    }

    let created;
    try {
      created = await createPayReceipt(ctx.env, {
        userId: user.id,
        amount: flags.a,
        senderName: flags.n,
        targetName: flags.t,
        description: flags.d,
        phone: flags.p,
        bank: flags.b,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not create receipt';
      await telegramSend(ctx.env, ctx.chatId, `❌ ${escapeHtml(msg)}\n\n${USAGE}`);
      logAdmin('payid_error', { fromId: ctx.fromId, error: msg });
      return;
    }

    const { receipt, bank } = created;
    const workerOrigin = String(ctx.env.WORKER_PUBLIC_URL || ctx.env.APP_ORIGIN || '').replace(
      /\/$/,
      ''
    );
    const receiptUrl = workerOrigin
      ? `${workerOrigin}/pay/receipt/${receipt.id}`
      : `/pay/receipt/${receipt.id}`;

    const pushPayload = buildPaymentPushPayload({
      bank,
      receipt,
      receiptUrl,
    });
    const pushResult = await sendWebPush(ctx.env, sub, pushPayload);

    const statusLine = pushResult.ok
      ? `✅ Push sent (${pushResult.status || 201})`
      : `⚠️ Receipt saved but push delivery failed: ${pushResult.error || pushResult.status}`;

    logAdmin('payid_ok', {
      fromId: ctx.fromId,
      receiptId: receipt.id,
      userId: user.id,
      bank: bank.key,
      amount_cents: receipt.amount_cents,
      pushOk: Boolean(pushResult.ok),
    });

    await telegramSend(
      ctx.env,
      ctx.chatId,
      `${statusLine}\n` +
        `Receipt: <code>${receipt.id}</code>\n` +
        `User: <code>${escapeHtml(user.email)}</code>\n` +
        `Bank: ${bank.display}\n` +
        `Amount: $${escapeHtml(receipt.amount)}\n` +
        `From: ${escapeHtml(receipt.sender_name)}\n` +
        `To: ${escapeHtml(receipt.target_name)}\n` +
        `Description: ${escapeHtml(receipt.description)}\n` +
        (receipt.phone ? `Phone: ${escapeHtml(receipt.phone)}\n` : '') +
        `Link: ${receiptUrl}`
    );
  },
});


/* ── webhook entry ─────────────────────────────────────── */

export async function handleTelegramWebhook(request, env) {
  const expected = webhookSecret(env);
  const secretHeader =
    request.headers.get('X-Telegram-Bot-Api-Secret-Token') ||
    request.headers.get('x-telegram-bot-api-secret-token') ||
    '';

  if (expected) {
    if (secretHeader.trim() !== expected) {
      console.log('telegram webhook: invalid secret');
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }
  } else {
    console.log('telegram webhook: TELEGRAM_WEBHOOK_SECRET not set — accepting without header check');
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const msg =
    update.message ||
    update.edited_message ||
    update.channel_post ||
    update.edited_channel_post ||
    null;

  if (!msg?.chat) return json({ ok: true, ignored: 'no message' });

  const text = (msg.text || msg.caption || '').trim();
  if (!text) return json({ ok: true, ignored: 'no text' });

  const fromId = msg.from?.id;
  const chatId = msg.chat.id;

  try {
    await ensureSchema(env);
  } catch (e) {
    console.log('telegram ensureSchema failed', e);
    await telegramSend(
      env,
      chatId,
      `DB error: ${e instanceof Error ? e.message : 'ensureSchema failed'}`
    );
    return json({ ok: true, error: 'schema' });
  }

  const ctx = {
    env,
    chatId,
    fromId,
    text,
    args: [],
    flags: {},
    isAdmin: isAdmin(env, fromId),
  };

  await dispatchCommand(ctx);
  return json({ ok: true });
}

/** Exposed for tests / future modules that want to add commands */
export { registerCommand, COMMANDS, dispatchCommand };
