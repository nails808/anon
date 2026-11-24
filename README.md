# Anon — Install-gated PWA + Auth + Push + Pay receipts

React + Vite PWA with:

- Home Screen install gate (standalone only)
- Email / password accounts (email = username, unique)
- Remember-me sessions
- Cloudflare Worker + D1 for auth, push subscriptions, payment receipts
- Telegram bot: new-user alerts + admin `/payid` command
- Bank-styled receipt pages (CommBank, Westpac, ANZ, NAB, Up)

## Prerequisites

- Node 20+
- Cloudflare account
- Wrangler: `npm i -g wrangler` then `wrangler login`
- A Telegram bot from [@BotFather](https://t.me/BotFather)

## 1. Clone and install

```bash
git clone https://github.com/nails808/anon.git
cd anon
npm install
cp .env.example .env
```

## 2. VAPID keys

```bash
npx web-push generate-vapid-keys
```

- Put the **public** key in `.env` as `VITE_VAPID_PUBLIC_KEY=...`
- Keep the **private** key for Worker secrets (never in `VITE_`)

## 3. D1 database

```bash
npx wrangler d1 create anon-push
```

Paste the `database_id` into `wrangler.toml`.

Apply migrations:

```bash
npx wrangler d1 migrations apply anon-push --remote
```

(Local: `npx wrangler d1 migrations apply anon-push --local`)

## 4. Worker secrets and vars

Edit `wrangler.toml`:

- `APP_ORIGIN` — exact HTTPS origin of the PWA (e.g. `https://your-domain.com`)
- `WORKER_PUBLIC_URL` — this Worker’s public URL (used in receipt links)

Set secrets:

```bash
npx wrangler secret put BOT_TOKEN          # from BotFather
npx wrangler secret put BOT_SECRET         # random string for webhook header
npx wrangler secret put ADMIN_IDS          # your Telegram numeric user id(s), comma-separated
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY  # full JWK JSON from web-push, or base64url PKCS8
npx wrangler secret put VAPID_SUBJECT      # e.g. mailto:you@example.com
```

Deploy:

```bash
npx wrangler deploy
```

## 5. Telegram webhook

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<your-worker>/telegram/webhook" \
  -d "secret_token=<BOT_SECRET>"
```

## 6. Frontend deploy

```bash
npm run build
```

Serve `dist/` over HTTPS (Cloudflare Pages, Netlify, etc.).

**Production routing:** proxy or route these paths on the PWA domain to the Worker:

- `/api/*`
- `/pay/receipt/*`
- `/telegram/webhook` (or call Worker URL directly for Telegram)

Or point the PWA’s API calls at the Worker origin and set CORS `APP_ORIGIN` correctly.

## 7. Local development

Terminal 1 — Worker:

```bash
npx wrangler dev
```

Terminal 2 — Vite (proxies `/api`, `/pay`, `/telegram` to port 8787):

```bash
npm run dev
```

Open the printed URL. For full PWA install behaviour use a tunnel (e.g. cloudflared) over HTTPS.

## Auth flow

1. Install to Home Screen → standalone mode
2. Log in or Create account (email + password)
3. Email is unique and becomes the username
4. **Remember me** stores the session token in `localStorage` (30 days); otherwise `sessionStorage` (1 day)
5. On successful register, Telegram admins receive: “New user created” + username

## Admin `/payid`

```
/payid -b <bank> -u <user> -a <amount> -n <name> -t <target> [-d <description>] [-p <phone>]
```

- Required: `-b -u -a -n -t`
- Banks: `commbank` (`cba`), `westpac`, `anz`, `nab`, `up`
- User must exist and have a Web Push subscription
- Creates a `pay_receipts` row, sends push (title = bank name, body = Paid {amount} to {target}), icon = `/icons/{bank}.png`
- Notification click opens `https://{worker}/pay/receipt/{id}`
- Receipt id: `N` + digits; date shown in Australia/Sydney as `D Month YYYY H:MMAM/PM (Syd/Melb time)`

## D1 tables

- `users` — email (unique), password_hash, password_salt
- `sessions` — token, user_id, expires_at, remember
- `push_subscriptions` — endpoint, keys, user_id
- `pay_receipts` — id, user_id, amount, sender_name, target_name, description, phone, bank, created_at

## Adding a new bank template

Upload a screenshot + bank name. Templates live in `worker/receiptTemplates/{bank}.js` and export `render(data)`. Icons go in `public/icons/{bank}.png`.

## Scope note

The five protection toggles and telemetry values are UI only. Live capabilities are: install gate, auth, push subscription, Telegram admin commands, and receipt pages.
