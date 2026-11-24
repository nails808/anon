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
.wrap{background:#0b1520}
.nav{background:#007dba}
.status-pill{background:#007dba33;color:#7ec8e8}
.card{background:#122233;border:1px solid #007dba44}
.logo{font-weight:800;font-size:18px;color:#7ec8e8;letter-spacing:2px;margin-bottom:8px}
.circle{width:56px;height:56px;border-radius:50%;border:3px solid #007dba;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;color:#7ec8e8;font-size:22px}
`;

  const body = `
<div class="wrap">
  ${closeNav({ title: 'Receipt', accent: '#7ec8e8' })}
  <section class="hero">
    <div class="logo">ANZ</div>
    <div class="circle">✓</div>
    <div class="status-pill">Recorded</div>
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
  <p class="foot">Internal application record — not an ANZ bank confirmation.</p>
</div>`;

  return documentShell({
    title: `ANZ receipt ${d.id}`,
    themeColor: '#007dba',
    styles,
    bodyHtml: body,
  });
}
