# Phase 3 — Financial Intelligence & Constraint Logic (MoneyMate)

## Health Calculation (Monthly)
- Inputs (per owner_ref, as_of date):
  - income_monthly = Σ monthlyEquivalent(income.amount, income.frequency)
  - fixed_monthly = Σ monthlyEquivalent(fixed.amount, fixed.frequency)
  - variable_prorated = Σ max(planned * month_progress, actual) for each variable plan
  - month_progress = elapsed_days / days_in_month (clamped 0–1)
- remaining = income_monthly − fixed_monthly − variable_prorated
- Category:
  - Good: remaining > 10,000
  - OK: 1 to 9,999
  - Not Well: shortfall 1 to 3,000 (remaining < 0 and |remaining| ≤ 3,000)
  - Worrisome: shortfall > 3,000
- Pseudocode:
  ```
  monthProgress = clamp(daysElapsed/asOfMonthLength, 0, 1)
  incomeMonthly = sum(monthlyEq(income))
  fixedMonthly = sum(monthlyEq(fixed))
  variableProrated = sum(max(plan.planned*monthProgress, plan.actualToDate))
  remaining = incomeMonthly - fixedMonthly - variableProrated
  category = pickCategory(remaining)
  ```

## Frequency → Monthly Equivalent
- monthlyEquivalent(amount, frequency):
  - monthly: amount
  - quarterly: amount / 3
  - yearly: amount / 12
  - (extend: weekly → amount * 52 / 12)

## Constraint Score (Approved Model)
- State: score (int), tier ∈ {green, amber, red}, recent_overspends (int), decay_applied_at.
- Overspend event: score += 5; recent_overspends += 1.
- Decay: apply on first read or scheduled monthly tick if `decay_applied_at < periodStart`; score = ceil(score * 0.95).
- Tiers: green 0–39, amber 40–69, red 70+.
- Effects:
  - amber: subtle darkening + stronger copy.
  - red: strong darkening + justification note required on variable overspend; no hard blocks.
- Pseudocode:
  ```
  function applyDecay(state, asOf):
    if month(state.decay_applied_at) < month(asOf):
      state.score = ceil(state.score * 0.95)
      state.decay_applied_at = asOfStartOfMonth

  function recordOverspend(state):
    state.score += 5
    state.recent_overspends += 1
    state.tier = tierFor(state.score)
  ```

## SIP Logic (for >monthly expenses/investments)
- monthlyEquivalent = totalAmount / monthsUntilDue
- recommended_sip = monthlyEquivalent
- Missed SIP (per period): adds to constraint score (+5).
- Preparedness for periodic expense: preparedness_ratio = saved / totalAmount.

## Future Bomb Preparedness (Approved)
- preparedness_ratio = saved / required (0–1).
- Thresholds:
  - Warn if < 0.70
  - Critical if < 0.40
- Lead time rule: if due ≤ 60 days, elevate severity (warn→critical).
- Pseudocode:
  ```
  severity = "ok"
  if ratio < 0.70: severity = "warn"
  if ratio < 0.40: severity = "critical"
  if daysToDue <= 60 and severity == "warn": severity = "critical"
  ```

## Overspend Detection
- Variable expense overspend: actual_to_date > planned → trigger alert, record overspend (+5).
- Fixed expense overspend: if paid > amount for period, flag but don’t double-penalize if it’s prepay.
- Debounce alerts per period to avoid spam (idempotent per owner_ref, period, category).

## Alerts
- Types: overspend, missed_investment, missed_sip, future_bomb_risk.
- Severity mapping:
  - overspend: warn if amber tier, critical if red tier or >20% over plan.
  - missed_sip/investment: warn on first miss, critical on 2+ consecutive misses.
  - future bomb: per preparedness rules above.
- State: open/resolved; resolution closes alert but keeps activity log.

## Monthly Health Snapshot Generation
- Triggered on:
  - Write to income/fixed/variable actuals/future bombs/investments.
  - Nightly or on-demand for “as_of”.
- Cache in Redis keyed by owner_ref + as_of; invalidate on writes.

## Sharing & Merge Implications
- owner_ref may be user or shared_account; permissions enforced by role.
- merge_finances_enabled flag controls pooled view/edit for relationship use-cases.
- Health, constraint, alerts computed per owner_ref (pooled if merged).

## Justification Note (Red Tier)
- On red tier, adding a new variable actual that exceeds plan requires a justification string; store in Activity payload.

## Example Calculations
- Health example (mid-month 0.5):
  - income: 135,000; fixed: 46,000 (incl. yearly insurance /12); variable planned: 22,000; actual so far: 13,200
  - variable_prorated = max(22,000 * 0.5, 13,200) = 13,200
  - remaining = 135,000 − 46,000 − 13,200 = 75,800 → Good
- Constraint score example:
  - Start score 42 (amber). Two overspends in same month: score = 52 → tier amber. Next month decay: ceil(52 * 0.95) = 50 (amber).
- Future bomb example:
  - total 60,000, saved 24,000 → ratio 0.4 → critical; if due in 45 days, remains critical.

## Open Minor Items
- Define retention for Activities and Alerts (proposed: 12–18 months live, archive after).
- Confirm whether justification notes need minimum length or templates.

