# Anon — Install-gated PWA + push subscription

Anon is a React + Vite PWA concept. The full dashboard is shown only when the page is running in installed/standalone mode. In an ordinary browser tab, users see device-specific installation instructions.

## Frontend

```bash
npm install
cp .env.example .env
# Set VITE_VAPID_PUBLIC_KEY in .env (instructions below)
npm run dev
```

Build with `npm run build`. Deploy the `dist/` directory to an HTTPS host. PWA installation and push notifications require HTTPS (localhost is allowed for local development).

### Home Screen install gate

- **iPhone/iPad:** Open the site in Safari → Share → Add to Home Screen → Add. Launch the saved Anon icon.
- **Android:** Open the site in Chrome → ⋮ menu → Install app (or Add to Home screen) → Install. Launch the Anon icon.

The dashboard intentionally starts with all five visual modules inactive on every launch. The central power control requests push permission and creates a browser PushSubscription on first use. If a browser subscription already exists, the control skips the permission/subscription flow and works as a visual demo. Individual switches remain independently interactive.

## Cloudflare Worker + D1 setup

1. Install Wrangler and authenticate:

   ```bash
   npm install
   npx wrangler login
   ```

2. Create the D1 database:

   ```bash
   npx wrangler d1 create anon-push
   ```

   Copy the returned `database_id` into `wrangler.toml`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

3. Apply the schema:

   ```bash
   npx wrangler d1 migrations apply anon-push --remote
   ```

4. Generate a VAPID key pair (for example, using the `web-push` CLI):

   ```bash
   npx web-push generate-vapid-keys
   ```

   Put the **public** key in the frontend `.env` file as `VITE_VAPID_PUBLIC_KEY`. Keep the VAPID **private** key secret; never put it in a `VITE_` variable or commit it to source control.

5. Set `APP_ORIGIN` in `wrangler.toml` to the exact HTTPS origin serving the PWA, then deploy the Worker:

   ```bash
   npx wrangler deploy
   ```

6. Route `/api/subscribe` on your PWA domain to this Worker. The frontend posts to the same-origin `/api/subscribe` path.

The D1 table is defined in `migrations/0001_create_push_subscriptions.sql`. Repeated subscriptions for the same endpoint update the stored keys and timestamp rather than creating duplicates.

## Push delivery

This implementation performs push subscription and D1 persistence. The service worker is ready to display incoming push events. It does not send notifications automatically; a VAPID-signed Web Push sender still needs to be implemented.

## Important scope

The five protection controls, proxy IP, location estimate and device ID are illustrative UI only. This project does not anonymise traffic, run a Tor-like proxy, spoof browser/device fingerprints, modify GPS, protect DNS, or perform penetration testing. Push subscription is the only live browser capability implemented.
