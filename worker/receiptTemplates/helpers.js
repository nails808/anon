/**
 * Shared helpers for bank receipt HTML templates.
 * All user-supplied values must pass through escapeHtml before interpolation.
 */

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format ISO / SQLite datetime to:
 * "D Month YYYY H:MMAM/PM (Syd/Melb time)" in Australia/Sydney.
 */
export function formatAestDateTime(isoOrSqlite) {
  let d;
  if (!isoOrSqlite) d = new Date();
  else if (String(isoOrSqlite).includes('T')) d = new Date(isoOrSqlite);
  else d = new Date(String(isoOrSqlite).replace(' ', 'T') + 'Z');

  if (Number.isNaN(d.getTime())) d = new Date();

  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  const day = get('day');
  const month = get('month');
  const year = get('year');
  let hour = get('hour');
  const minute = get('minute');
  const dayPeriod = (get('dayPeriod') || '').toUpperCase().replace(/\s/g, '');
  hour = String(Number(hour));

  return `${day} ${month} ${year} ${hour}:${minute}${dayPeriod} (Syd/Melb time)`;
}

/** Canonical money display from amount string or cents */
export function formatAmount(amount) {
  const n = Number(String(amount).replace(/[^0-9.-]/g, ''));
  if (Number.isFinite(n)) {
    return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return escapeHtml(String(amount ?? ''));
}

/** Normalise template data with escaped fields ready for HTML */
export function prepareReceiptData(raw) {
  const amount = formatAmount(raw.amount);
  return {
    id: escapeHtml(raw.id),
    amount,
    amountRaw: escapeHtml(raw.amount),
    sender_name: escapeHtml(raw.sender_name),
    target_name: escapeHtml(raw.target_name),
    description: escapeHtml(raw.description || 'Goods'),
    phone: raw.phone ? escapeHtml(raw.phone) : '',
    bank: escapeHtml(raw.bank),
    created_at: formatAestDateTime(raw.created_at),
    created_at_raw: escapeHtml(raw.created_at),
  };
}

export function row(label, value) {
  return `<div class="row"><span class="label">${escapeHtml(label)}</span><span class="value">${value}</span></div>`;
}

/**
 * Shared document shell. bodyHtml is trusted template structure only;
 * all dynamic values must already be escaped.
 */
export function documentShell({ title, themeColor, bodyHtml, styles = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <meta name="theme-color" content="${escapeHtml(themeColor || '#111111')}"/>
  <meta name="robots" content="noindex,nofollow"/>
  <title>${escapeHtml(title)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{min-height:100%;}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      background:#0a0a0a;color:#fff;-webkit-font-smoothing:antialiased;
    }
    a{color:inherit;text-decoration:none}
    .internal-banner{
      font-size:11px;letter-spacing:.4px;text-align:center;padding:8px 12px;
      background:rgba(255,255,255,.06);color:rgba(255,255,255,.55);text-transform:uppercase;
    }
    ${styles}
  </style>
</head>
<body>
  <div class="internal-banner">Internal application record — not a bank confirmation</div>
  ${bodyHtml}
</body>
</html>`;
}

export function closeNav({ title, accent }) {
  return `<header class="nav">
    <a class="nav-btn" href="javascript:history.length>1?history.back():window.close()">Close</a>
    <span class="nav-title">${escapeHtml(title)}</span>
    <span class="nav-btn nav-share" style="color:${escapeHtml(accent || '#fff')}">Share</span>
  </header>`;
}

export const SHARED_NAV_CSS = `
.nav{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;padding-top:max(14px,env(safe-area-inset-top));font-size:16px;font-weight:500}
.nav-btn{background:none;border:none;color:#fff;font-size:16px;cursor:pointer;padding:4px 8px;min-width:56px}
.nav-title{font-weight:600;letter-spacing:.2px}
.nav-share{text-align:right;opacity:.9}
.wrap{max-width:430px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;padding-bottom:max(24px,env(safe-area-inset-bottom))}
.hero{text-align:center;padding:28px 20px 8px}
.status-pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;margin-bottom:16px;letter-spacing:.3px;text-transform:uppercase}
.amount{font-size:34px;font-weight:700;letter-spacing:-.5px;margin:4px 0 6px}
.recipient{font-size:16px;opacity:.9;line-height:1.35}
.phone-line{margin-top:6px;font-size:14px;opacity:.75}
.card{margin:18px 16px;border-radius:14px;overflow:hidden}
.row{display:flex;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-size:15px}
.row:last-child{border-bottom:none}
.row .label{opacity:.55;flex-shrink:0}
.row .value{text-align:right;font-weight:500;word-break:break-word;max-width:62%}
.foot{margin:16px 20px 8px;font-size:12px;line-height:1.45;opacity:.55;text-align:center}
`;
