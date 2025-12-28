# Phase 1 Clarifications & Assumptions (for approval)

## Constraint Scoring
- Decision: overspend adds fixed +5; decay 5% per month; tiers: green 0-39, amber 40-69, red 70+. (Approved)

## Future Bomb Preparedness
- Decision: preparedness = saved/required; warn <70%, critical <40%; stricter when due ≤60 days. (Approved)

## SIP Recommendation Logic
- Decision: monthlyEquivalent = totalAmount / monthsUntilDue; SIP = monthlyEquivalent; missed SIP increases constraint score. (Approved)

## Sharing Permissions
- Decision: roles owner (all), editor (CRUD finances), viewer (read-only); default invite = editor; add “merge finances” option for relationship use-cases. (Approved)

## Theme Darkening / Alert Intensification
- Decision: amber = subtle darkening + stronger copy; red = strong darkening + justification note on variable overspend; no hard blocks. (Approved)

## Activity Log Granularity
- Pending: which events are logged.
- Proposal: log auth events, create/update/delete of all financial entities, sharing actions, alert triggers/resolutions.
- Action: confirm retention period and PII constraints.

## Health Indicator Behavior
- Pending: animation/state transitions spec.
- Proposal: smooth transitions between categories; show delta vs last month; allow tap to view formula explanation.
- Action: confirm animation cues and accessibility requirements.

## Partial Payments
- Pending: handling for fixed expenses/credit cards.
- Proposal: support partials; unpaid portion remains in dues; Activity logs partials; health uses paid vs outstanding.
- Action: confirm needed granularity (per-item vs aggregated).

## Time & Calendar Handling
- Pending: timezone/locale rules.
- Proposal: store timestamps UTC; render per user timezone; month progress based on user’s local month length.
- Action: confirm if fiscal-year or locale-specific calendars matter.

## Assumptions (until confirmed)
- Alerts are idempotent per period to avoid spam.
- Health snapshot recalculates on data change and at least daily.
- Constraint score follows approved fixed+decay model.
- Preparedness uses saved/required ratio; SIP is monthly savings path to 100%.

