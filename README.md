# Anon — Install-gated privacy PWA

Progressive Web App with email/password auth, Cloudflare Worker + D1 backend, Telegram admin bot, Web Push, and bank-themed internal payment records.

**Internal records only.** Receipts and push notifications are application records — not bank confirmations and not proof of cleared funds.

## Stack

- Frontend: Vite 6 + React 18 (JSX), lucide-react, service worker PWA
- Backend: Cloudflare Workers + D1
- Admin: Telegram Bot webhook on the same Worker

## Features

- Install gate (standalone / Home Screen)
- Register / login (unique email, PBKDF2 passwords, Remember me sessions)
- Telegram admin: `/start` `/help` `/whoami` `/status` `/users` `/user` `/payid`
- New-user Telegram alerts
- Web Push subscriptions bound to authenticated users
- `/payid` → D1 `pay_receipts` + push + HTML receipt pages
- Bank templates: CommBank, Westpac, ANZ, NAB, Up

---

## 1. Prerequisites

- Node.js 20+
- Cloudflare account
- Wrangler: `npm i -g wrangler` then `wrangler login`
- Telegram bot from [@BotFather](https://t.me/BotFather)
- Your Telegram numeric user id (message [@userinfobot](https://t.me/userinfobot) or use `/whoami` after webhook is live)

```bash
git clone https://github.com/nails808/anon.git
cd anon
npm install
cp .env.example .env
```

---

## 2. VAPID keys (Web Push)

```bash
npx web-push generate-vapid-keys
```

Put the **public** key in `.env`:

```env
VITE_VAPID_PUBLIC_KEY=BGxxxx...
```

Keep the **private** key for Worker secrets only (never `VITE_`).

---

## 3. Cloudflare D1

```bash
npx wrangler d1 create anon-push
```

Copy the returned `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "anon-push"
database_id = "YOUR_DATABASE_ID"
migrations_dir = "migrations"
```

Apply migrations:

```bash
npx wrangler d1 migrations apply anon-push --remote
```

Migrations:

| File | Purpose |
|------|---------|
| `0001_create_push_subscriptions.sql` | Push endpoints |
| `0002_users_sessions_receipts.sql` | users, sessions, login_attempts, pay_receipts |
| `0003_pay_receipts.sql` | amount_cents + indexes |

`ensureSchema()` also creates/upgrades tables at runtime.

---

## 4. Worker variables & secrets

Edit `wrangler.toml` `[vars]`:

```toml
APP_ORIGIN = "https://your-pwa-domain.com"
WORKER_PUBLIC_URL = "https://anon-push-api.YOUR_SUBDOMAIN.workers.dev"
```

Set secrets (never commit these):

```bash
# Telegram
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET   # random long string
npx wrangler secret put TELEGRAM_ADMIN_ID         # your numeric Telegram id

# Web Push
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY         # JWK JSON preferred, or PKCS8 base64url
npx wrangler secret put VAPID_SUBJECT             # mailto:you@example.com
```

Legacy aliases still accepted: `BOT_TOKEN`, `BOT_SECRET`, `ADMIN_IDS`.

Deploy:

```bash
npx wrangler deploy
```

---

## 5. Telegram webhook

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<WORKER_HOST>/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Verify:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

In Telegram, message the bot:

- `/whoami` — confirm your id matches `TELEGRAM_ADMIN_ID`
- `/help` — command list
- `/status` — configuration health

---

## 6. Frontend build & host

```bash
npm run build
```

Host `dist/` on HTTPS (Cloudflare Pages, any static host).

**Routing:** Proxy these paths from the PWA origin to the Worker (or set CORS + absolute API base):

- `/api/*`
- `/pay/receipt/*`
- `/telegram/webhook` (usually only on the Worker hostname)

Local dev:

```bash
npx wrangler dev    # Worker on :8787
npm run dev         # Vite proxies /api /pay /telegram → 8787
```

---

## 7. End-to-end smoke test

1. Open PWA in browser → install to Home Screen → open standalone.
2. **Register** a new account → Telegram admin receives **NEW USER REGISTERED**.
3. **Log out** / **log in** with Remember me; refresh; session should restore.
4. Tap the power control → allow notifications → subscription stored against your user.
5. From Telegram (admin):

```text
/payid -b cba -u you@example.com -a 20.00 -n "Test Account" -t "J Fletcher" -d Goods -p +61400000000
```

6. Phone should show push: `{Bank} — Internal Record`.
7. Tap notification → receipt HTML opens (`/pay/receipt/N…`).
8. Confirm date shows `D Month YYYY H:MMAM/PM (Syd/Melb time)`.

---

## 8. Admin commands

| Command | Access | Purpose |
|---------|--------|---------|
| `/start` `/help` | Public summary / full for admin | Docs |
| `/whoami` | Public | Telegram id |
| `/status` | Admin | Config health |
| `/users` | Admin | Counts + recent |
| `/user -u email` | Admin | Account detail |
| `/payid …` | Admin | Create receipt + push |

`/payid` flags: `-b -u -a -n -t` required; `-d` (default Goods), `-p` optional. Quote values with spaces.

---

## 9. Security notes

- Passwords: PBKDF2-SHA256, 100k iterations, random salt
- Sessions: opaque tokens in D1; Remember me 30d vs 1d
- Login rate limit: 8 failures/email or 30/IP per 15 minutes
- Uniform login errors (enumeration resistance)
- SQL: parameterized statements only
- Receipt HTML: all dynamic fields HTML-escaped
- Push subscribe requires auth; endpoints cannot be stolen across users
- Telegram commands require admin id; webhook secret header validated when set
- No secrets in frontend source

**Outstanding / known limits**

- Web Push body is JSON + VAPID JWT (no full RFC 8291 `aes128gcm` payload encryption). Some endpoints may reject; delivery is best-effort. Receipt is still stored and linked in Telegram.
- Receipt pages are reachable by unguessable id without a session (for notification deep links). If a session is present, ownership is enforced.
- Official bank marks (Osko glyph, Siri logo) are CSS approximations.

---

## 10. Project layout

```text
src/main.jsx          Auth + install gate + dashboard
src/style.css
public/sw.js          Push display + notificationclick
public/icons/         Bank notification icons
worker/index.js       HTTP router
worker/db.js          D1 + ensureSchema
worker/telegram.js    Command registry
worker/push.js        VAPID send + payment payload
worker/receipts.js    createPayReceipt validation
worker/banks.js       Bank keys + amount parsing
worker/receiptTemplates/
migrations/
wrangler.toml
```
