/** Shared helpers for bank receipt HTML templates. */

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format ISO / SQLite datetime to:
 * "D Month YYYY H:MMAM/PM (Syd/Melb time)"
 * in Australia/Sydney.
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

  // Ensure no leading zero on hour for the requested style
  hour = String(Number(hour));

  return `${day} ${month} ${year} ${hour}:${minute}${dayPeriod} (Syd/Melb time)`;
}

export function formatAmount(amount) {
  const n = Number(String(amount).replace(/[^0-9.-]/g, ''));
  if (Number.isFinite(n)) {
    return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(amount);
}

export function baseShell({ title, bodyHtml, accent = '#ffcc00' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <meta name="theme-color" content="#000000"/>
  <title>${escapeHtml(title)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;-webkit-font-smoothing:antialiased}
    a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
