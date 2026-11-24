/**
 * Create and validate admin-issued payment receipt records.
 * These are internal application records — not bank confirmations.
 */
import { makeReceiptId } from './crypto.js';
import { resolveBank, parseAmountToCents, BANK_KEYS } from './banks.js';
import { findUserByEmail, findUserById, insertReceipt } from './db.js';

/**
 * Validate inputs and persist a pay_receipts row.
 *
 * @param {object} env
 * @param {object} input
 * @param {string|number} [input.userId]
 * @param {string} [input.userEmail] - resolved if userId not given
 * @param {string|number} input.amount - human amount string
 * @param {string} input.senderName
 * @param {string} input.targetName
 * @param {string} [input.description]
 * @param {string|null} [input.phone]
 * @param {string} input.bank - key or alias
 * @returns {Promise<{ receipt: object, bank: object, user: object }>}
 */
export async function createPayReceipt(env, input) {
  const bank = resolveBank(input.bank);
  if (!bank) {
    throw new Error(`Unknown bank. Allowed: ${BANK_KEYS.join(', ')}`);
  }

  let user = null;
  if (input.userId != null) {
    user = await findUserById(env, input.userId);
  } else if (input.userEmail) {
    user = await findUserByEmail(env, input.userEmail);
  }
  if (!user) {
    throw new Error('User not found');
  }

  const senderName = String(input.senderName || '').trim();
  const targetName = String(input.targetName || '').trim();
  if (!senderName) throw new Error('Sender name (-n) is required');
  if (!targetName) throw new Error('Target name (-t) is required');
  if (senderName.length > 200) throw new Error('Sender name is too long');
  if (targetName.length > 200) throw new Error('Target name is too long');

  let description = String(input.description ?? '').trim();
  if (!description) description = 'Goods';
  if (description.length > 500) throw new Error('Description is too long');

  let phone = input.phone != null ? String(input.phone).trim() : null;
  if (phone === '') phone = null;
  if (phone && phone.length > 40) throw new Error('Phone is too long');

  const { cents, display } = parseAmountToCents(input.amount);

  const id = makeReceiptId();
  if (!/^N\d+$/.test(id)) throw new Error('Internal error generating receipt id');

  // ISO-8601 UTC for consistent storage
  const createdAt = new Date().toISOString();

  const row = {
    id,
    user_id: user.id,
    amount_cents: cents,
    amount: display,
    sender_name: senderName,
    target_name: targetName,
    description,
    phone,
    bank: bank.key,
    created_at: createdAt,
  };

  await insertReceipt(env, row);

  return { receipt: row, bank, user };
}
