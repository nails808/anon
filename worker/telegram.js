/**
 * Telegram admin bot for Anon Worker.
 * Secrets (prefer TELEGRAM_* names; legacy BOT_* still accepted):
 *   TELEGRAM_BOT_TOKEN | BOT_TOKEN
 *   TELEGRAM_ADMIN_ID  | ADMIN_IDS   (comma-separated numeric IDs)
 *   TELEGRAM_WEBHOOK_SECRET | BOT_SECRET
 */
import { ensureSchema, findUserByEmail, getPushForUser, insertReceipt } from './db.js';
import { makeReceiptId } from './crypto.js';
import { sendWebPush } from './push.js';
import { json } from './http.js';

const BANKS = {
  commbank: { key: 'commbank', display: 'CommBank', aliases: ['cba', 'commbank', 'commonwealth'] },
  westpac: { key: 'westpac', display: 'Westpac', aliases: ['westpac', 'wbc'] },
  anz: { key: 'anz', display: 'ANZ', aliases: ['anz'] },
  nab: { key: 'nab', display: 'NAB', aliases: ['nab'] },
  up: { key: 'up', display: 'Up', aliases: ['up'] },
};

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

function resolveBank(raw) {
  const v = String(raw || '').trim().toLowerCase();
  for (const bank of Object.values(BANKS)) {
    if (bank.aliases.includes(v) || bank.key === v) return bank;
  }
  return null;
}

function logAdmin(action, detail) {
  console.log(JSON.stringify({ type: 'admin_action', action, at: new Date().toISOString(), ...detail }));
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
 * Call only once per successful createUser — failed/duplicate register never reaches here.
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
  // Present a readable UTC time; operators can convert locally
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

function parseFlags(text) {
  const flags = {};
  const re = /-([buntdp])\s+("([^"]*)"|'([^']*)'|(\S+))/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase();
    flags[key] = (m[3] ?? m[4] ?? m[5] ?? '').trim();
  }
  return flags;
}

const PAYID_USAGE =
  `Usage:\n` +
  `<code>/payid -b &lt;bank&gt; -u &lt;user&gt; -a &lt;amount&gt; -n &lt;name&gt; -t &lt;target&gt; [-d &lt;description&gt;] [-p &lt;phone&gt;]</code>\n\n` +
  `Banks: commbank (cba), westpac, anz, nab, up\n` +
  `Required: -b -u -a -n -t\n` +
  `Optional: -d (default Goods), -p`;

const HELP_TEXT =
  `<b>Anon admin bot</b>\n\n` +
  `Commands (admin only):\n` +
  `/help — this message\n` +
  `/whoami — your Telegram id\n` +
  `/status — bot health\n` +
  `/payid — create a payment receipt + push\n\n` +
  PAYID_USAGE;

async function handlePayid(env, chatId, fromId, text) {
  const flags = parseFlags(text);
  const missing = [];
  if (!flags.b) missing.push('-b (bank)');
  if (!flags.u) missing.push('-u (user email)');
  if (!flags.a) missing.push('-a (amount)');
  if (!flags.n) missing.push('-n (sender name)');
  if (!flags.t) missing.push('-t (target)');

  if (missing.length) {
    await telegramSend(env, chatId, `❌ Missing required flags: ${missing.join(', ')}\n\n${PAYID_USAGE}`);
    logAdmin('payid_invalid', { fromId, missing });
    return;
  }

  const bank = resolveBank(flags.b);
  if (!bank) {
    await telegramSend(
      env,
      chatId,
      `❌ Unknown bank <code>${escapeHtml(flags.b)}</code>.\nAllowed: commbank, westpac, anz, nab, up\n\n${PAYID_USAGE}`
    );
    logAdmin('payid_bad_bank', { fromId, bank: flags.b });
    return;
  }

  const user = await findUserByEmail(env, flags.u);
  if (!user) {
    await telegramSend(env, chatId, `❌ No app user found for <code>${escapeHtml(flags.u)}</code>.`);
    logAdmin('payid_user_missing', { fromId, email: flags.u });
    return;
  }

  const sub = await getPushForUser(env, user.id);
  if (!sub) {
    await telegramSend(
      env,
      chatId,
      `❌ User <code>${escapeHtml(user.email)}</code> has no Web Push subscription. Ask them to enable notifications in the app.`
    );
    logAdmin('payid_no_push', { fromId, userId: user.id });
    return;
  }

  const amount = flags.a.replace(/^\$/, '').trim();
  const description = (flags.d || 'Goods').trim() || 'Goods';
  const phone = flags.p ? flags.p.trim() : null;
  const receiptId = makeReceiptId();
  const createdAt = new Date().toISOString();

  await insertReceipt(env, {
    id: receiptId,
    user_id: user.id,
    amount,
    sender_name: flags.n.trim(),
    target_name: flags.t.trim(),
    description,
    phone,
    bank: bank.key,
    created_at: createdAt,
  });

  const workerOrigin = String(env.WORKER_PUBLIC_URL || env.APP_ORIGIN || '').replace(/\/$/, '');
  const receiptUrl = workerOrigin
    ? `${workerOrigin}/pay/receipt/${receiptId}`
    : `/pay/receipt/${receiptId}`;

  let body = `Paid $${amount} to ${flags.t.trim()}`;
  if (phone) body += `\n${phone}`;

  const iconPath = `/icons/${bank.key}.png`;
  const pushResult = await sendWebPush(env, sub, {
    title: bank.display,
    body,
    icon: iconPath,
    badge: iconPath,
    url: receiptUrl,
    data: { url: receiptUrl, receiptId },
  });

  const statusLine = pushResult.ok
    ? `✅ Push sent (${pushResult.status || 201})`
    : `⚠️ Receipt saved but push failed: ${pushResult.error || pushResult.status}`;

  logAdmin('payid_ok', {
    fromId,
    receiptId,
    userId: user.id,
    bank: bank.key,
    amount,
    pushOk: Boolean(pushResult.ok),
  });

  await telegramSend(
    env,
    chatId,
    `${statusLine}\n` +
      `Receipt: <code>${receiptId}</code>\n` +
      `User: <code>${escapeHtml(user.email)}</code>\n` +
      `Bank: ${bank.display}\n` +
      `Amount: $${escapeHtml(amount)}\n` +
      `To: ${escapeHtml(flags.t)}\n` +
      `Link: ${receiptUrl}`
  );
}

export async function handleTelegramWebhook(request, env) {
  // Validate secret header when configured (recommended in production)
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

  if (!msg?.chat) {
    return json({ ok: true, ignored: 'no message' });
  }

  const text = (msg.text || msg.caption || '').trim();
  if (!text) {
    return json({ ok: true, ignored: 'no text' });
  }

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

  const parts = text.split(/\s+/);
  const cmd = parts[0].split('@')[0].toLowerCase();

  // Public: /start and /whoami (whoami helps admins discover their id)
  if (cmd === '/start') {
    if (isAdmin(env, fromId)) {
      await telegramSend(env, chatId, HELP_TEXT);
    } else {
      await telegramSend(
        env,
        chatId,
        'Anon bot is online.\nYou are not authorised to run admin commands.'
      );
    }
    return json({ ok: true });
  }

  if (cmd === '/whoami') {
    await telegramSend(
      env,
      chatId,
      `Your Telegram user id: <code>${escapeHtml(fromId)}</code>\n` +
        `Admin: ${isAdmin(env, fromId) ? 'yes' : 'no'}`
    );
    return json({ ok: true });
  }

  // All other slash commands require admin
  if (cmd.startsWith('/')) {
    if (!isAdmin(env, fromId)) {
      logAdmin('denied', { fromId, cmd, chatId });
      await telegramSend(env, chatId, '⛔ Access denied. Admin only.');
      return json({ ok: true });
    }

    if (cmd === '/help') {
      await telegramSend(env, chatId, HELP_TEXT);
      logAdmin('help', { fromId });
      return json({ ok: true });
    }

    if (cmd === '/status') {
      const hasToken = Boolean(botToken(env));
      const admins = adminIds(env).length;
      await telegramSend(
        env,
        chatId,
        `<b>Status</b>\n` +
          `Bot token: ${hasToken ? 'configured' : 'missing'}\n` +
          `Admins configured: ${admins}\n` +
          `Webhook secret: ${webhookSecret(env) ? 'configured' : 'not set'}\n` +
          `Time: ${new Date().toISOString()}`
      );
      logAdmin('status', { fromId });
      return json({ ok: true });
    }

    if (cmd === '/payid') {
      await handlePayid(env, chatId, fromId, text);
      return json({ ok: true });
    }

    await telegramSend(env, chatId, `Unknown command. Try /help`);
    logAdmin('unknown_cmd', { fromId, cmd });
    return json({ ok: true });
  }

  return json({ ok: true, ignored: 'not a command' });
}
