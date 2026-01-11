-- Materialized health cache table for quick dashboard reads
CREATE TABLE IF NOT EXISTS health_cache (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  billing_period_id VARCHAR(20) NOT NULL,
  available_funds DECIMAL(12,2),
  health_category VARCHAR(20),
  health_percentage INTEGER,
  constraint_score INTEGER,
  constraint_tier VARCHAR(10),
  computed_at TIMESTAMP DEFAULT NOW(),
  is_stale BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_health_cache_stale ON health_cache(user_id) WHERE is_stale = TRUE;


