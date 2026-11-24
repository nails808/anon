/**
 * ANZ-style internal receipt (light theme, blue accent).
 * Internal application record only — not a bank confirmation.
 */
import { prepareReceiptData, documentShell } from './helpers.js';

export function render(raw) {
  const d = prepareReceiptData(raw);
  const phoneBlock = d.phone ? `<p class="phone">${d.phone}</p>` : '';

  const styles = `
    body{background:#eef5fa}
    .sheet{max-width:430px;margin:0 auto;min-height:100vh;background:#fff;color:#12263a;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
    .nav{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
      padding-top:max(12px,env(safe-area-inset-top));background:#007dba;color:#fff}
    .nav a,.nav button{background:none;border:none;color:#fff;font-size:16px;cursor:pointer;min-width:52px;padding:6px 0;font-family:inherit}
    .nav .title{font-weight:600;font-size:17px}
    .body{padding:28px 20px;padding-bottom:max(28px,env(safe-area-inset-bottom))}
    .check{width:48px;height:48px;border-radius:50%;background:#007dba;display:flex;align-items:center;justify-content:center;margin-bottom:16px}
    .paid{font-size:24px;font-weight:700;line-height:1.25;margin:0 0 6px}
    .phone{color:#5a6a7a;font-size:15px;margin:0 0 8px}
    .ref{color:#8a9aaa;font-size:13px;margin:0 0 24px}
    .section{margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #e8eef3}
    .label{font-size:12px;font-weight:600;color:#7a8a9a;text-transform:uppercase;letter-spacing:.5px;margin:0 0 4px}
    .value{font-size:16px;margin:0;line-height:1.35}
    .notice{font-size:14px;color:#445;line-height:1.4;margin:12px 0 20px}
    .osko{font-size:14px;color:#7a8a9a}
    .foot{font-size:11px;color:#9ab;margin-top:24px;line-height:1.4}
    .logo{font-weight:800;letter-spacing:2px;color:#007dba;font-size:18px;margin-bottom:12px}
  `;

  const body = `
<div class="sheet">
  <header class="nav">
    <a href="javascript:history.length>1?history.back():window.close()">Close</a>
    <span class="title">Receipt</span>
    <button type="button" onclick="if(navigator.share)navigator.share({title:document.title,url:location.href}).catch(()=>{})">Share</button>
  </header>
  <div class="body">
    <div class="logo">ANZ</div>
    <div class="check"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <h1 class="paid">Paid $${d.amount}<br/>to ${d.target_name}</h1>
    ${phoneBlock}
    <p class="ref">Receipt no: ${d.id}</p>
    <div class="section"><p class="label">From</p><p class="value">${d.sender_name}</p></div>
    <div class="section"><p class="label">Description</p><p class="value">${d.description}</p></div>
    <div class="section"><p class="label">Transaction date</p><p class="value">${d.created_at}</p></div>
    <p class="notice">For security, payments to recently added payees may be held for 24 hours.</p>
    <p class="osko">Sent through Osko</p>
    <p class="foot">Internal application record only. Not an ANZ bank confirmation. Does not prove funds have cleared.</p>
  </div>
</div>`;

  return documentShell({ title: `ANZ receipt ${d.id}`, themeColor: '#007dba', styles, bodyHtml: body });
}
