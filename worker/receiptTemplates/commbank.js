import { escapeHtml, formatAestDateTime, formatAmount, baseShell } from './helpers.js';

/**
 * Mobile fullscreen CommBank-style receipt.
 * Nav: Close | Receipt | Share
 * Green check, Paid amount to target, optional phone, receipt no, From, Description,
 * Transaction Date, 24h hold notice, Sent through Osko, Add to Siri row.
 */
export function render(data) {
  const amount = formatAmount(data.amount);
  const when = formatAestDateTime(data.created_at);
  const phoneBlock = data.phone
    ? `<div class="phone">${escapeHtml(data.phone)}</div>`
    : '';

  const body = `
<style>
  .cba-root{min-height:100vh;background:#111;color:#fff;display:flex;flex-direction:column;max-width:430px;margin:0 auto}
  .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;padding-top:max(14px,env(safe-area-inset-top));font-size:16px;font-weight:500}
  .nav button,.nav a{background:none;border:none;color:#fff;font-size:16px;cursor:pointer;padding:4px 0}
  .nav .title{font-weight:600;letter-spacing:.2px}
  .nav .share{opacity:.95}
  .hero{text-align:center;padding:28px 20px 12px}
  .check{width:64px;height:64px;border-radius:50%;background:#00c853;display:inline-flex;align-items:center;justify-content:center;margin-bottom:18px}
  .check svg{width:36px;height:36px}
  .paid-line{font-size:22px;font-weight:600;line-height:1.25}
  .paid-line .amt{font-weight:700}
  .phone{margin-top:6px;font-size:15px;opacity:.85}
  .card{margin:18px 16px;background:#1c1c1e;border-radius:14px;overflow:hidden}
  .row{display:flex;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-size:15px}
  .row:last-child{border-bottom:none}
  .row .label{opacity:.55;flex-shrink:0}
  .row .value{text-align:right;font-weight:500;word-break:break-word}
  .notice{margin:8px 20px 0;font-size:13px;line-height:1.4;opacity:.7;text-align:center}
  .osko{margin:22px 16px 8px;text-align:center;font-size:14px;opacity:.8;display:flex;align-items:center;justify-content:center;gap:8px}
  .osko-badge{display:inline-flex;align-items:center;gap:6px;background:#1c1c1e;border-radius:20px;padding:8px 14px}
  .osko-dot{width:8px;height:8px;border-radius:50%;background:#00c853}
  .siri{margin:12px 16px 28px;background:#1c1c1e;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px}
  .siri-icon{width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#5b6cff,#a855f7);display:flex;align-items:center;justify-content:center;font-size:18px}
  .siri-text{flex:1;font-size:14px;line-height:1.3}
  .siri-text strong{display:block;font-size:15px;margin-bottom:2px}
  .siri-chevron{opacity:.4;font-size:20px}
</style>
<div class="cba-root">
  <header class="nav">
    <a href="javascript:history.back()">Close</a>
    <span class="title">Receipt</span>
    <button type="button" class="share" onclick="navigator.share?navigator.share({title:'Receipt',url:location.href}):navigator.clipboard.writeText(location.href)">Share</button>
  </header>

  <div class="hero">
    <div class="check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <div class="paid-line">Paid <span class="amt">$${escapeHtml(amount)}</span> to ${escapeHtml(data.target_name)}</div>
    ${phoneBlock}
  </div>

  <div class="card">
    <div class="row"><span class="label">Receipt no.</span><span class="value">${escapeHtml(data.id)}</span></div>
    <div class="row"><span class="label">From</span><span class="value">${escapeHtml(data.sender_name)}</span></div>
    <div class="row"><span class="label">Description</span><span class="value">${escapeHtml(data.description || 'Goods')}</span></div>
    <div class="row"><span class="label">Transaction Date</span><span class="value">${escapeHtml(when)}</span></div>
  </div>

  <p class="notice">This payment may take up to 24 hours to appear in your transaction history.</p>

  <div class="osko">
    <div class="osko-badge"><span class="osko-dot"></span> Sent through Osko</div>
  </div>

  <div class="siri">
    <div class="siri-icon" aria-hidden="true">🎤</div>
    <div class="siri-text"><strong>Add to Siri</strong>Get a receipt summary with your voice</div>
    <span class="siri-chevron">›</span>
  </div>
</div>`;

  return baseShell({ title: `Receipt ${data.id}`, bodyHtml: body, accent: '#ffcc00' });
}
