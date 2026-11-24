/**
 * CommBank-style internal receipt (light theme).
 * Visual reference: mobile CBA "Paid $X to Y" receipt with green check,
 * Close/Receipt/Share nav, Osko line, Add to Siri row.
 *
 * Internal application record only — not a bank confirmation.
 */
import {
  prepareReceiptData,
  documentShell,
  escapeHtml,
} from './helpers.js';

export function render(raw) {
  const d = prepareReceiptData(raw);
  const phoneBlock = d.phone
    ? `<p class="phone">${d.phone}</p>`
    : '';

  const styles = `
    body { background: #f2f2f2; }
    .cba {
      max-width: 430px;
      margin: 0 auto;
      min-height: 100vh;
      background: #ffffff;
      color: #111111;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      padding-top: max(12px, env(safe-area-inset-top));
      background: #f7f7f8;
      border-bottom: 1px solid #e5e5ea;
      min-height: 52px;
    }
    .nav a, .nav button.action, .nav span.action {
      color: #111;
      font-size: 17px;
      font-weight: 400;
      text-decoration: none;
      min-width: 56px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px 0;
    }
    .nav .close {
      font-size: 22px;
      line-height: 1;
      font-weight: 300;
      min-width: 44px;
    }
    .nav .title {
      font-size: 17px;
      font-weight: 600;
      text-align: center;
      flex: 1;
      color: #111;
    }
    .nav .share { text-align: right; }
    .body {
      padding: 28px 20px 32px;
      flex: 1;
      padding-bottom: max(32px, env(safe-area-inset-bottom));
    }
    .check {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #34c759;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 18px;
    }
    .check svg { display: block; }
    .paid {
      font-size: 26px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.3px;
      color: #000;
      margin: 0 0 6px;
    }
    .phone {
      font-size: 16px;
      color: #8e8e93;
      margin: 0 0 10px;
      font-weight: 400;
    }
    .receipt-no {
      font-size: 14px;
      color: #aeaeb2;
      margin: 0 0 28px;
    }
    .section {
      margin-bottom: 22px;
    }
    .section .label {
      font-size: 16px;
      font-weight: 700;
      color: #000;
      margin: 0 0 4px;
    }
    .section .value {
      font-size: 16px;
      font-weight: 400;
      color: #3a3a3c;
      line-height: 1.35;
      margin: 0;
    }
    .section .value.muted {
      color: #8e8e93;
    }
    .notice {
      font-size: 15px;
      line-height: 1.4;
      color: #1c1c1e;
      margin: 8px 0 22px;
      font-weight: 400;
    }
    .osko {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      color: #8e8e93;
      margin: 0 0 28px;
    }
    .osko-word {
      font-weight: 600;
      color: #6e6e73;
      letter-spacing: 0.2px;
    }
    .osko-mark {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2.5px solid #8e8e93;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .osko-mark::after {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 2px solid #8e8e93;
    }
    .siri-prompt {
      font-size: 16px;
      font-weight: 600;
      color: #000;
      line-height: 1.3;
      margin: 0 0 14px;
    }
    .siri-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      border: 1.5px solid #c7c7cc;
      border-radius: 999px;
      padding: 10px 18px 10px 12px;
      background: #fff;
      font-size: 16px;
      font-weight: 500;
      color: #1c1c1e;
    }
    .siri-orb {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background:
        radial-gradient(circle at 30% 30%, #fff 0%, transparent 40%),
        conic-gradient(from 210deg, #5b9fff, #ff5bb0, #7a5cff, #5b9fff);
      box-shadow: 0 1px 3px rgba(0,0,0,.12);
      flex-shrink: 0;
    }
    .internal-banner {
      background: #f2f2f7;
      color: #8e8e93;
      border-bottom: 1px solid #e5e5ea;
    }
  `;

  const body = `
<div class="cba">
  <header class="nav">
    <a class="close" href="javascript:history.length>1?history.back():window.close()" aria-label="Close">✕</a>
    <span class="title">Receipt</span>
    <button type="button" class="action share" onclick="if(navigator.share)navigator.share({title:document.title,url:location.href}).catch(()=>{})">Share</button>
  </header>
  <div class="body">
    <div class="check" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M5.5 12.5l4.5 4.5 8.5-9" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <h1 class="paid">Paid $${d.amount}<br/>to ${d.target_name}</h1>
    ${phoneBlock}
    <p class="receipt-no">Receipt no: ${d.id}</p>

    <div class="section">
      <p class="label">From</p>
      <p class="value">${d.sender_name}</p>
    </div>

    <div class="section">
      <p class="label">Description</p>
      <p class="value">${d.description}</p>
    </div>

    <div class="section">
      <p class="label">Transaction Date</p>
      <p class="value muted">${d.created_at}</p>
    </div>

    <p class="notice">For security, payments to recently added payees may be held for 24 hours.</p>

    <div class="osko">
      <span>Sent through</span>
      <span class="osko-word">Osko</span>
      <span class="osko-mark" aria-hidden="true"></span>
    </div>

    <p class="siri-prompt">Add to Siri so you can ask to pay ${d.target_name.toUpperCase()}</p>
    <div class="siri-btn" role="button" aria-label="Add to Siri">
      <span class="siri-orb" aria-hidden="true"></span>
      <span>Add to Siri</span>
    </div>
  </div>
</div>`;

  return documentShell({
    title: `Receipt ${d.id}`,
    themeColor: '#f7f7f8',
    styles,
    bodyHtml: body,
  });
}
