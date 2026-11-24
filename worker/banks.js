/**
 * Supported banks for internal payment receipts.
 * Icons live at /icons/{key}.png in the PWA public assets.
 * These are application records only — not bank-issued confirmations.
 */

export const BANKS = {
  commbank: {
    key: 'commbank',
    display: 'CommBank',
    aliases: ['cba', 'commbank', 'commonwealth'],
    icon: '/icons/commbank.png',
  },
  westpac: {
    key: 'westpac',
    display: 'Westpac',
    aliases: ['westpac', 'wbc'],
    icon: '/icons/westpac.png',
  },
  anz: {
    key: 'anz',
    display: 'ANZ',
    aliases: ['anz'],
    icon: '/icons/anz.png',
  },
  nab: {
    key: 'nab',
    display: 'NAB',
    aliases: ['nab'],
    icon: '/icons/nab.png',
  },
  up: {
    key: 'up',
    display: 'Up',
    aliases: ['up'],
    icon: '/icons/up.png',
  },
};

export const BANK_KEYS = Object.keys(BANKS);

export function resolveBank(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return null;
  if (BANKS[v]) return BANKS[v];
  for (const bank of Object.values(BANKS)) {
    if (bank.aliases.includes(v)) return bank;
  }
  return null;
}

/**
 * Parse a money string into integer cents. Rejects invalid input.
 * Accepts: "12.34", "12", "$12.34", "1,234.56"
 * @returns {{ cents: number, display: string }}
 */
export function parseAmountToCents(raw) {
  let s = String(raw ?? '').trim();
  if (!s) throw new Error('Amount is required');
  s = s.replace(/^\$/, '').replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    throw new Error('Amount must be a positive number with up to 2 decimal places');
  }
  const [whole, frac = ''] = s.split('.');
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isFinite(cents) || cents <= 0) throw new Error('Amount must be a positive value');
  if (cents > 99_999_999_99) throw new Error('Amount is too large');
  const display = (cents / 100).toFixed(2);
  return { cents, display };
}

export function formatCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '0.00';
  return (n / 100).toFixed(2);
}
