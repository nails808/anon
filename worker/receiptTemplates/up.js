/**
 * Up Bank-style internal receipt (light theme, pink/purple accent).
 * Internal application record only — not a bank confirmation.
 */
import { prepareReceiptData, documentShell } from './helpers.js';

export function render(raw) {
  const d = prepareReceiptData(raw);
  const phoneBlock = d.phone ? `<p class="phone">${d.phone}</p>` : '';

  const styles = `
    body{background:#faf5ff}
    .sheet{max-width:430px;margin:0 auto;min-height:100vh;background:#fff;color:#1a1024;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
    .nav{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
      padding-top:max(12px,env(safe-area-inset-top));border-bottom:1px solid #f0e6f8}
    .nav a,.nav button{background:none;border:none;color:#c026a0;font-size:16px;cursor:pointer;min-width:52px;padding:6px 0;font-family:inherit}
    .nav .title{font-weight:600;font-size:17px;color:#1a1024}
    .body{padding:28px 20px;padding-bottom:max(28px,env(safe-area-inset-bottom))}
    .logo{font-weight:800;font-size:28px;background:linear-gradient(90deg,#ff7eb6,#a855f7);
      -webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:16px}
    .check{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#ff7eb6,#a855f7);
      display:flex;align-items:center;justify-content:center;margin-bottom:16px}
    .paid{font-size:24px;font-weight:700;line-height:1.25;margin:0 0 6px}
    .phone{color:#7a6a8a;font-size:15px;margin:0 0 8px}
    .ref{color:#a090b0;font-size:13px;margin:0 0 24px}
    .section{margin-bottom:18px}
    .label{font-size:13px;font-weight:600;color:#9a8aaa;margin:0 0 4px}
    .value{font-size:16px;margin:0;line-height:1.35}
    .notice{font-size:14px;color:#554;line-height:1.4;margin:12px 0 20px;padding:12px;background:#faf5ff;border-radius:12px}
    .osko{font-size:14px;color:#9a8aaa}
    .foot{font-size:11px;color:#b0a0c0;margin-top:24px;line-height:1.4}
  `;

  const body = `
<div class="sheet">
  <header class="nav">
    <a href="javascript:history.length>1?history.back():window.close()">Close</a>
    <span class="title">Up</span>
    <button type="button" onclick="if(navigator.share)navigator.share({title:document.title,url:location.href}).catch(()=>{})">Share</button>
  </header>
  <div class="body">
    <div class="logo">up.</div>
    <div class="check"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <h1 class="paid">Paid $${d.amount}<br/>to ${d.target_name}</h1>
    ${phoneBlock}
    <p class="ref">Receipt no: ${d.id}</p>
    <div class="section"><p class="label">From</p><p class="value">${d.sender_name}</p></div>
    <div class="section"><p class="label">Description</p><p class="value">${d.description}</p></div>
    <div class="section"><p class="label">Transaction date</p><p class="value">${d.created_at}</p></div>
    <p class="notice">For security, payments to recently added payees may be held for 24 hours.</p>
    <p class="osko">Sent through Osko</p>
    <p class="foot">Internal application record only. Not an Up bank confirmation. Does not prove funds have cleared.</p>
  </div>
</div>`;

  return documentShell({ title: `Up receipt ${d.id}`, themeColor: '#a855f7', styles, bodyHtml: body });
}
