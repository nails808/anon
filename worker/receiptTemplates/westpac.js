import {
  prepareReceiptData,
  documentShell,
  closeNav,
  SHARED_NAV_CSS,
  row,
} from './helpers.js';

export function render(raw) {
  const d = prepareReceiptData(raw);
  const phoneBlock = d.phone ? `<div class="phone-line">${d.phone}</div>` : '';

  const styles = `
${SHARED_NAV_CSS}
.wrap{background:#1a0a0c}
.nav{background:#da1710;color:#fff}
.status-pill{background:#da171033;color:#ff8a80}
.card{background:#2a1215;border:1px solid #da171044}
.amount{color:#fff}
.bank-bar{height:4px;background:linear-gradient(90deg,#da1710,#ff5a52)}
.logo{font-weight:800;letter-spacing:1px;font-size:14px;color:#ff8a80;margin-bottom:8px}
`;

  const body = `
<div class="wrap">
  <div class="bank-bar"></div>
  ${closeNav({ title: 'Payment', accent: '#ff8a80' })}
  <section class="hero">
    <div class="logo">WESTPAC</div>
    <div class="status-pill">Internal record</div>
    <div class="amount">$${d.amount}</div>
    <div class="recipient">Paid to ${d.target_name}</div>
    ${phoneBlock}
  </section>
  <section class="card">
    ${row('From', d.sender_name)}
    ${row('Description', d.description)}
    ${row('Date', d.created_at)}
    ${row('Reference', d.id)}
  </section>
  <p class="foot">Internal application record — not a Westpac bank confirmation.</p>
</div>`;

  return documentShell({
    title: `Westpac receipt ${d.id}`,
    themeColor: '#da1710',
    styles,
    bodyHtml: body,
  });
}
