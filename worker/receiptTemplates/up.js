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
.wrap{background:linear-gradient(180deg,#1a0b24 0%,#0d0612 100%)}
.nav{background:transparent}
.status-pill{background:#ff7eb622;color:#ffb3d9}
.card{background:#241230;border:1px solid #ff7eb633}
.logo{font-weight:800;font-size:28px;background:linear-gradient(90deg,#ff7eb6,#c084fc);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:8px}
.amount{background:linear-gradient(90deg,#ff7eb6,#c084fc);-webkit-background-clip:text;background-clip:text;color:transparent}
`;

  const body = `
<div class="wrap">
  ${closeNav({ title: 'Up', accent: '#ff7eb6' })}
  <section class="hero">
    <div class="logo">up.</div>
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
  <p class="foot">Internal application record — not an Up bank confirmation.</p>
</div>`;

  return documentShell({
    title: `Up receipt ${d.id}`,
    themeColor: '#1a0b24',
    styles,
    bodyHtml: body,
  });
}
