-- Payment receipt records (admin-issued internal records — not bank confirmations).
-- amount_cents stores the precise value in the smallest currency unit (cents).
-- amount is the canonical display string (e.g. "12.34") derived from amount_cents.

CREATE TABLE IF NOT EXISTS pay_receipts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  amount TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  target_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT 'Goods',
  phone TEXT,
  bank TEXT NOT NULL CHECK (bank IN ('commbank', 'westpac', 'anz', 'nab', 'up')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pay_receipts_user ON pay_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_receipts_created ON pay_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_pay_receipts_bank ON pay_receipts(bank);
CREATE INDEX IF NOT EXISTS idx_pay_receipts_user_created ON pay_receipts(user_id, created_at);
