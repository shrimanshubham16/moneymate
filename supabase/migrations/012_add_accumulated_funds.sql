-- Add accumulated_funds columns for SIPs and investments
-- This tracks monthly contributions that accumulate until the due date

-- Add accumulated_funds to fixed_expenses (for SIPs)
ALTER TABLE fixed_expenses 
ADD COLUMN IF NOT EXISTS accumulated_funds DECIMAL(12, 2) DEFAULT 0;

-- Add accumulated_funds to investments
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS accumulated_funds DECIMAL(12, 2) DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_accumulated ON fixed_expenses(accumulated_funds) WHERE accumulated_funds > 0;
CREATE INDEX IF NOT EXISTS idx_investments_accumulated ON investments(accumulated_funds) WHERE accumulated_funds > 0;



