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
.wrap{background:#111}
.status-pill{background:#00c85322;color:#00e676}
.check{width:64px;height:64px;border-radius:50%;background:#00c853;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px}
.card{background:#1c1c1e}
.bank-tag{font-size:13px;opacity:.7;margin-top:10px}
`;

  const body = `
<div class="wrap">
  ${closeNav({ title: 'Receipt', accent: '#00c853' })}
  <section class="hero">
    <div class="check">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#fff" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>
    </div>
    <div class="status-pill">Recorded</div>
    <div class="amount">$${d.amount}</div>
    <div class="recipient">to ${d.target_name}</div>
    ${phoneBlock}
    <div class="bank-tag">CommBank · Internal record</div>
  </section>
  <section class="card">
    ${row('From', d.sender_name)}
    ${row('Description', d.description)}
    ${row('Transaction date', d.created_at)}
    ${row('Reference', d.id)}
  </section>
  <p class="foot">This is an internal application record only. It is not a bank-issued confirmation and does not prove funds have cleared.</p>
</div>`;

  return documentShell({
    title: `CommBank receipt ${d.id}`,
    themeColor: '#111111',
    styles,
    bodyHtml: body,
  });
}
