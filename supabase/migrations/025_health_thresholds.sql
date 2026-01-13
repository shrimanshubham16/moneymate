-- Per-user configurable health thresholds
CREATE TABLE IF NOT EXISTS health_thresholds (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  good_min NUMERIC DEFAULT 20,           -- healthScore >= good_min => good
  ok_min NUMERIC DEFAULT 10,             -- ok range lower bound
  ok_max NUMERIC DEFAULT 19.99,          -- ok range upper bound
  not_well_max NUMERIC DEFAULT 9.99,     -- 0..not_well_max => not_well, else worrisome
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE health_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY health_thresholds_select ON health_thresholds
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY health_thresholds_upsert ON health_thresholds
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY health_thresholds_update ON health_thresholds
  FOR UPDATE USING (user_id = auth.uid());

COMMENT ON TABLE health_thresholds IS 'Per-user health score thresholds';
