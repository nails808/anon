import { escapeHtml, formatAestDateTime, formatAmount, baseShell } from './helpers.js';

export function render(data) {
  const amount = formatAmount(data.amount);
  const when = formatAestDateTime(data.created_at);
  const phoneBlock = data.phone ? `<div class="sub">${escapeHtml(data.phone)}</div>` : '';

  const body = `
<style>
  .anz-root{min-height:100vh;background:#0a1628;color:#fff;max-width:430px;margin:0 auto;display:flex;flex-direction:column}
  .nav{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;padding-top:max(14px,env(safe-area-inset-top));font-size:16px}
  .nav a,.nav button{background:none;border:none;color:#fff;font-size:16px;cursor:pointer}
  .hero{text-align:center;padding:28px 20px}
  .check{width:56px;height:56px;border-radius:50%;background:#00a9e0;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:14px}
  .paid{font-size:20px;font-weight:600}
  .sub{margin-top:6px;opacity:.8;font-size:14px}
  .card{margin:12px 16px;background:#132038;border-radius:12px;overflow:hidden}
  .row{display:flex;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px}
  .row:last-child{border-bottom:none}
  .label{opacity:.6}
  .value{font-weight:500;text-align:right}
  .foot{margin:16px 20px;font-size:12px;opacity:.65;text-align:center;line-height:1.4}
  .osko{text-align:center;margin:8px 0 28px;font-size:13px;opacity:.75}
</style>
<div class="anz-root">
  <header class="nav">
    <a href="javascript:history.back()">Close</a>
    <span>Receipt</span>
    <button type="button" onclick="navigator.share?navigator.share({title:'Receipt',url:location.href}):0">Share</button>
  </header>
  <div class="hero">
    <div class="check">✓</div>
    <div class="paid">Paid $${escapeHtml(amount)} to ${escapeHtml(data.target_name)}</div>
    ${phoneBlock}
  </div>
  <div class="card">
    <div class="row"><span class="label">Receipt no.</span><span class="value">${escapeHtml(data.id)}</span></div>
    <div class="row"><span class="label">From</span><span class="value">${escapeHtml(data.sender_name)}</span></div>
    <div class="row"><span class="label">Description</span><span class="value">${escapeHtml(data.description || 'Goods')}</span></div>
    <div class="row"><span class="label">Transaction Date</span><span class="value">${escapeHtml(when)}</span></div>
  </div>
  <p class="foot">This payment may take up to 24 hours to appear in your transaction history.</p>
  <div class="osko">Sent through Osko</div>
</div>`;

  return baseShell({ title: `ANZ Receipt ${data.id}`, bodyHtml: body });
}
