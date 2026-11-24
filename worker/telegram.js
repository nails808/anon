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

function resolveBank(raw) {
  const v = String(raw || '').trim().toLowerCase();
  for (const bank of Object.values(BANKS)) {
    if (bank.aliases.includes(v) || bank.key === v) return bank;
  }
  return null;
}

export async function telegramSend(env, chatId, text) {
  if (!env.BOT_TOKEN) {
    console.log('telegramSend: BOT_TOKEN missing');
    return { ok: false, error: 'BOT_TOKEN missing' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
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
      return { ok: false, error: data.description || String(res.status) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
  }
}

export async function notifyAdminsNewUser(env, email) {
  const ids = String(env.ADMIN_IDS || '')
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length || !env.BOT_TOKEN) return;
  const text = `🆕 <b>New user created</b>\nUsername: <code>${escapeHtml(email)}</code>`;
  await Promise.all(ids.map((id) => telegramSend(env, id, text)));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isAdmin(env, fromId) {
  const ids = String(env.ADMIN_IDS || '')
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(String(fromId));
}

function parseFlags(text) {
  // /payid -b bank -u user -a amount -n name -t target [-d desc] [-p phone]
  const flags = {};
  const re = /-([buntdp])\s+("([^"]*)"|'([^']*)'|(\S+))/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase();
    flags[key] = (m[3] ?? m[4] ?? m[5] ?? '').trim();
  }
  return flags;
}

const PAYID_USAGE = `Usage:
<code>/payid -b &lt;bank&gt; -u &lt;user&gt; -a &lt;amount&gt; -n &lt;name&gt; -t &lt;target&gt; [-d &lt;description&gt;] [-p &lt;phone&gt;]</code>

Banks: commbank (cba), westpac, anz, nab, up
Required: -b -u -a -n -t
Optional: -d (default Goods), -p`;

async function handlePayid(env, chatId, text) {
  const flags = parseFlags(text);
  const missing = [];
  if (!flags.b) missing.push('-b (bank)');
  if (!flags.u) missing.push('-u (user email)');
  if (!flags.a) missing.push('-a (amount)');
  if (!flags.n) missing.push('-n (sender name)');
  if (!flags.t) missing.push('-t (target)');

  if (missing.length) {
    await telegramSend(
      env,
      chatId,
      `❌ Missing required flags: ${missing.join(', ')}\n\n${PAYID_USAGE}`
    );
    return;
  }

  const bank = resolveBank(flags.b);
  if (!bank) {
    await telegramSend(
      env,
      chatId,
      `❌ Unknown bank <code>${escapeHtml(flags.b)}</code>.\nAllowed: commbank, westpac, anz, nab, up\n\n${PAYID_USAGE}`
    );
    return;
  }

  const user = await findUserByEmail(env, flags.u);
  if (!user) {
    await telegramSend(env, chatId, `❌ No app user found for <code>${escapeHtml(flags.u)}</code>.`);
    return;
  }

  const sub = await getPushForUser(env, user.id);
  if (!sub) {
    await telegramSend(
      env,
      chatId,
      `❌ User <code>${escapeHtml(user.email)}</code> has no Web Push subscription. Ask them to enable notifications in the app.`
    );
    return;
  }

  const amount = flags.a.replace(/^\$/, '').trim();
  const description = (flags.d || 'Goods').trim() || 'Goods';
  const phone = flags.p ? flags.p.trim() : null;
  const receiptId = makeReceiptId();
  // Store as UTC ISO; receipt page formats to Australia/Sydney
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

  const workerOrigin = (env.WORKER_PUBLIC_URL || env.APP_ORIGIN || '').replace(/\/$/, '');
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
  const secretHeader =
    request.headers.get('X-Telegram-Bot-Api-Secret-Token') ||
    request.headers.get('x-telegram-bot-api-secret-token') ||
    '';
  const expected = String(env.BOT_SECRET || '').trim();
  if (expected && secretHeader.trim() !== expected) {
    return json({ ok: false, error: 'Invalid Telegram secret' }, 401);
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
    await telegramSend(
      env,
      chatId,
      `DB error: ${e instanceof Error ? e.message : 'ensureSchema failed'}`
    );
    return json({ ok: true, error: 'schema' });
  }

  const parts = text.split(/\s+/);
  const cmd = parts[0].split('@')[0].toLowerCase();

  if (cmd === '/start' || cmd === '/help') {
    await telegramSend(
      env,
      chatId,
      `Anon admin bot.\n\nCommands (admin only):\n${PAYID_USAGE}`
    );
    return json({ ok: true });
  }

  if (cmd === '/payid') {
    if (!isAdmin(env, fromId)) {
      await telegramSend(env, chatId, '⛔ Admin only.');
      return json({ ok: true });
    }
    await handlePayid(env, chatId, text);
    return json({ ok: true });
  }

  // Ignore unknown commands quietly for non-admins
  if (isAdmin(env, fromId) && cmd.startsWith('/')) {
    await telegramSend(env, chatId, `Unknown command. Try /help`);
  }
  return json({ ok: true });
}
