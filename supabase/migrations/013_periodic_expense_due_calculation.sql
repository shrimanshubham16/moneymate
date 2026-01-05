-- Function to calculate when a periodic expense is actually due
-- Returns the next due date based on start_date and frequency

CREATE OR REPLACE FUNCTION get_next_due_date(
  p_start_date DATE,
  p_frequency VARCHAR,
  p_today DATE DEFAULT CURRENT_DATE
)
RETURNS DATE AS $$
DECLARE
  v_next_due DATE;
  v_months_since_start INTEGER;
BEGIN
  -- If start_date is in the future, return start_date
  IF p_start_date > p_today THEN
    RETURN p_start_date;
  END IF;
  
  -- Calculate months since start
  v_months_since_start := EXTRACT(YEAR FROM AGE(p_today, p_start_date))::INTEGER * 12 
                         + EXTRACT(MONTH FROM AGE(p_today, p_start_date))::INTEGER;
  
  -- Calculate next due date based on frequency
  CASE p_frequency
    WHEN 'monthly' THEN
      -- Next due is start of next month (same day)
      v_next_due := DATE_TRUNC('month', p_today) + (EXTRACT(DAY FROM p_start_date)::INTEGER - 1) * INTERVAL '1 day';
      IF v_next_due <= p_today THEN
        v_next_due := v_next_due + INTERVAL '1 month';
      END IF;
      
    WHEN 'quarterly' THEN
      -- Next due is every 3 months from start_date
      v_next_due := p_start_date;
      WHILE v_next_due <= p_today LOOP
        v_next_due := v_next_due + INTERVAL '3 months';
      END LOOP;
      
    WHEN 'yearly' THEN
      -- Next due is every 12 months from start_date
      v_next_due := p_start_date;
      WHILE v_next_due <= p_today LOOP
        v_next_due := v_next_due + INTERVAL '12 months';
      END LOOP;
      
    ELSE
      -- Default to monthly
      v_next_due := DATE_TRUNC('month', p_today) + (EXTRACT(DAY FROM p_start_date)::INTEGER - 1) * INTERVAL '1 day';
      IF v_next_due <= p_today THEN
        v_next_due := v_next_due + INTERVAL '1 month';
      END IF;
  END CASE;
  
  RETURN v_next_due;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if a periodic expense is due in current billing period
CREATE OR REPLACE FUNCTION is_periodic_expense_due(
  p_start_date DATE,
  p_frequency VARCHAR,
  p_month_start_day INTEGER,
  p_today DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_next_due DATE;
  v_billing_start DATE;
  v_billing_end DATE;
BEGIN
  -- Calculate next due date
  v_next_due := get_next_due_date(p_start_date, p_frequency, p_today);
  
  -- Calculate current billing period
  IF EXTRACT(DAY FROM p_today) >= p_month_start_day THEN
    v_billing_start := DATE_TRUNC('month', p_today) + (p_month_start_day - 1) * INTERVAL '1 day';
    v_billing_end := DATE_TRUNC('month', p_today + INTERVAL '1 month') + (p_month_start_day - 1) * INTERVAL '1 day';
  ELSE
    v_billing_start := DATE_TRUNC('month', p_today - INTERVAL '1 month') + (p_month_start_day - 1) * INTERVAL '1 day';
    v_billing_end := DATE_TRUNC('month', p_today) + (p_month_start_day - 1) * INTERVAL '1 day';
  END IF;
  
  -- Check if next due date falls within current billing period
  RETURN v_next_due >= v_billing_start AND v_next_due < v_billing_end;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_next_due_date(DATE, VARCHAR, DATE) TO postgres, anon, authenticated;
GRANT EXECUTE ON FUNCTION is_periodic_expense_due(DATE, VARCHAR, INTEGER, DATE) TO postgres, anon, authenticated;



