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
.wrap{background:#0e0e0e}
.nav{border-bottom:1px solid #333}
.status-pill{background:#333;color:#ddd}
.card{background:#1a1a1a;border:1px solid #333}
.logo{font-weight:700;font-size:15px;letter-spacing:3px;color:#aaa;margin-bottom:10px}
.stripe{height:3px;background:#fff;width:48px;margin:0 auto 16px}
`;

  const body = `
<div class="wrap">
  ${closeNav({ title: 'Transaction', accent: '#fff' })}
  <section class="hero">
    <div class="logo">NAB</div>
    <div class="stripe"></div>
    <div class="status-pill">Internal record</div>
    <div class="amount">$${d.amount}</div>
    <div class="recipient">to ${d.target_name}</div>
    ${phoneBlock}
  </section>
  <section class="card">
    ${row('From', d.sender_name)}
    ${row('Description', d.description)}
    ${row('Date', d.created_at)}
    ${row('Reference', d.id)}
  </section>
  <p class="foot">Internal application record — not a NAB bank confirmation.</p>
</div>`;

  return documentShell({
    title: `NAB receipt ${d.id}`,
    themeColor: '#0e0e0e',
    styles,
    bodyHtml: body,
  });
}
