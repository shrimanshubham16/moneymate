-- Payments table for tracking paid/unpaid status
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('fixed_expense', 'investment', 'loan')),
  entity_id UUID NOT NULL,
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  amount DECIMAL(12, 2) NOT NULL,
  paid_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id, month)
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(month);
CREATE INDEX IF NOT EXISTS idx_payments_entity ON payments(entity_type, entity_id);

