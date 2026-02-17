-- 027: Add RSU tax rate, expected decline, and conversion rate columns to incomes
-- rsu_tax_rate: Percentage of shares withheld for tax on vesting (default 33%)
-- rsu_expected_decline: Conservative price buffer % for future bomb planning (default 20%)
-- rsu_conversion_rate: Stored forex rate when stock currency differs from user currency (nullable)

ALTER TABLE incomes ADD COLUMN IF NOT EXISTS rsu_tax_rate DECIMAL(5,2) DEFAULT 33.00;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS rsu_expected_decline DECIMAL(5,2) DEFAULT 20.00;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS rsu_conversion_rate DECIMAL(12,4);
