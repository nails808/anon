/**
 * Westpac-style internal receipt (light theme, red accent).
 * Structure mirrors typical AU mobile payment confirmation sheets.
 * Internal application record only — not a bank confirmation.
 */
import { prepareReceiptData, documentShell } from './helpers.js';

export function render(raw) {
  const d = prepareReceiptData(raw);
  const phoneBlock = d.phone ? `<p class="phone">${d.phone}</p>` : '';

  const styles = `
    body{background:#f5f5f5}
    .sheet{max-width:430px;margin:0 auto;min-height:100vh;background:#fff;color:#1a1a1a;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
    .topbar{height:4px;background:#da1710}
    .nav{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
      padding-top:max(12px,env(safe-area-inset-top));border-bottom:1px solid #eee;background:#fff}
    .nav a,.nav button{background:none;border:none;color:#da1710;font-size:16px;cursor:pointer;min-width:52px;padding:6px 0;font-family:inherit}
    .nav .title{font-weight:600;font-size:17px;color:#1a1a1a}
    .body{padding:28px 20px;padding-bottom:max(28px,env(safe-area-inset-bottom))}
    .badge{display:inline-flex;align-items:center;gap:8px;margin-bottom:16px}
    .dot{width:40px;height:40px;border-radius:50%;background:#da1710;display:flex;align-items:center;justify-content:center}
    .paid{font-size:24px;font-weight:700;line-height:1.25;margin:0 0 6px;letter-spacing:-.2px}
    .phone{color:#666;font-size:15px;margin:0 0 8px}
    .ref{color:#999;font-size:13px;margin:0 0 24px}
    .section{margin-bottom:20px}
    .label{font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.4px;margin:0 0 4px}
    .value{font-size:16px;color:#1a1a1a;margin:0;line-height:1.35}
    .notice{font-size:14px;color:#444;line-height:1.4;margin:8px 0 20px;padding:12px;background:#faf5f5;border-radius:8px;border-left:3px solid #da1710}
    .osko{font-size:14px;color:#888;margin:0 0 8px}
    .foot{font-size:11px;color:#aaa;margin-top:24px;line-height:1.4}
    .brand{font-weight:800;letter-spacing:1px;color:#da1710;font-size:12px;margin-bottom:12px}
  `;

  const body = `
<div class="sheet">
  <div class="topbar"></div>
  <header class="nav">
    <a href="javascript:history.length>1?history.back():window.close()">Close</a>
    <span class="title">Payment</span>
    <button type="button" onclick="if(navigator.share)navigator.share({title:document.title,url:location.href}).catch(()=>{})">Share</button>
  </header>
  <div class="body">
    <div class="brand">WESTPAC</div>
    <div class="badge">
      <div class="dot"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>
    <h1 class="paid">Paid $${d.amount}<br/>to ${d.target_name}</h1>
    ${phoneBlock}
    <p class="ref">Receipt no: ${d.id}</p>
    <div class="section"><p class="label">From</p><p class="value">${d.sender_name}</p></div>
    <div class="section"><p class="label">Description</p><p class="value">${d.description}</p></div>
    <div class="section"><p class="label">Transaction date</p><p class="value">${d.created_at}</p></div>
    <p class="notice">For security, payments to recently added payees may be held for 24 hours.</p>
    <p class="osko">Sent through Osko</p>
    <p class="foot">Internal application record only. Not a Westpac bank confirmation. Does not prove funds have cleared.</p>
  </div>
</div>`;

  return documentShell({ title: `Westpac receipt ${d.id}`, themeColor: '#da1710', styles, bodyHtml: body });
}
