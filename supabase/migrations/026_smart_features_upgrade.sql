-- Smart Features Upgrade Migration
-- 1. Investment Priority Tag
-- 2. RSU Income Fields + include_in_health toggle

-- ============================================================
-- 1. Investment Priority
-- ============================================================
ALTER TABLE investments ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN investments.is_priority IS 'Priority investments are never suggested for pausing and are treated as sacred obligations';

-- ============================================================
-- 2. Income RSU fields + include_in_health
-- ============================================================
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS include_in_health BOOLEAN DEFAULT TRUE;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS income_type VARCHAR(20) DEFAULT 'regular';
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS rsu_ticker VARCHAR(20);
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS rsu_grant_count INTEGER;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS rsu_vesting_schedule VARCHAR(20);
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS rsu_currency VARCHAR(10);
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS rsu_stock_price DECIMAL(12, 2);
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS rsu_price_updated_at TIMESTAMP;

COMMENT ON COLUMN incomes.include_in_health IS 'Whether this income source should be included in health score calculations';
COMMENT ON COLUMN incomes.income_type IS 'Type of income: regular or rsu';
COMMENT ON COLUMN incomes.rsu_ticker IS 'Stock ticker symbol for RSU income (e.g. AAPL, GOOGL)';
COMMENT ON COLUMN incomes.rsu_grant_count IS 'Number of RSU shares in the grant';
COMMENT ON COLUMN incomes.rsu_vesting_schedule IS 'Vesting frequency: monthly, quarterly, yearly';
COMMENT ON COLUMN incomes.rsu_currency IS 'Currency of the stock (e.g. USD, EUR)';
COMMENT ON COLUMN incomes.rsu_stock_price IS 'Last known stock price per share';
COMMENT ON COLUMN incomes.rsu_price_updated_at IS 'When the stock price was last updated';
