# Phase 2 — Data Models & Relationships (MoneyMate)

## Modeling Principles
- Deterministic, auditable: store raw inputs + derived values (e.g., monthly_equiv) with versioning.
- Support sharing: entities can belong to a user or a shared account; enforce role checks.
- Time-aware: frequency, start/end dates, and as-of effective ranges.
- Activity-first: every mutation logged for audit.

## Core Entities
- User: id, email, username (immutable), theme_mode, preferences.
- SharedAccount: id, name, created_by.
- SharedAccountMember: shared_account_id, user_id, role (owner/editor/viewer), merge_finances_enabled (bool).
- Income: id, owner_ref (user_id or shared_account_id), source, amount, frequency, start_date, end_date, notes.
- FixedExpense: id, owner_ref, name, amount, frequency, category, start_date, end_date, is_sip_flag.
- VariableExpensePlan: id, owner_ref, name, planned, category, start_date, end_date.
- VariableExpenseActual: id, plan_id, amount, incurred_at, notes.
- Investment: id, owner_ref, name, amount, status (active/paused), frequency, next_due_at, notes.
- CreditCard: id, owner_ref, name, statement_date, due_date, bill_amount, paid_amount, notes.
- Loan (derived from fixed where category=Loan): loan_id, fixed_expense_id, tenure_months, paid_to_date (denormalized).
- FutureBomb: id, owner_ref, name, due_date, total_amount, monthly_equiv, preparedness_ratio, notes.
- Alert: id, owner_ref, type, severity, message, period, state (open/resolved), created_at.
- ConstraintScore: id, owner_ref, score, tier, recent_overspends, as_of, decay_applied_at.
- MonthlyHealthSnapshot: id, owner_ref, as_of, income_monthly, fixed_monthly, variable_prorated, remaining, category.
- ThemeState: id, owner_ref, mode (health_auto/manual), selected_theme, constraint_tier_effect.
- Activity: id, owner_ref, actor_id, entity_type, entity_id, action, payload, created_at.

## Key Relationships
- User 1..* SharedAccountMember; SharedAccount 1..* SharedAccountMember.
- owner_ref is (user_id xor shared_account_id) on financial entities; enforce via DB constraint.
- VariableExpensePlan 1..* VariableExpenseActual (actuals roll up to plan).
- FixedExpense (category=Loan) ↔ Loan (1:1 derived).
- MonthlyHealthSnapshot belongs to owner_ref; computed per period.
- ConstraintScore belongs to owner_ref; updated on overspend/missed SIP with decay.
- ThemeState belongs to owner_ref; driven by health/constraint.
- Alerts reference owner_ref; may link entity_id (expense, investment, future bomb).
- Activities reference owner_ref and actor_id (user).

## Field Details (selected)
- frequency: enum (monthly, quarterly, yearly, weekly if later). Store raw + monthly_equiv (computed).
- monetary fields: integer minor units (paise) to avoid float error.
- dates: store UTC; render in user timezone.
- preparedness_ratio: saved/required (0–1); warn <0.7, critical <0.4; lead-time threshold 60 days.
- constraint_score: integer; overspend +5; decay 5% per month; tiers 0-39/40-69/70+.
- merge_finances_enabled: boolean on SharedAccountMember to allow pooled view/edit.

## Derived & Caching
- monthly_equiv on Income/FixedExpense/Investment/FutureBomb for fast queries; recompute on write.
- health snapshot cached per owner_ref per as_of; invalidated on writes.
- constraint score cached per owner_ref; decay applied lazily on access or via scheduled job.

## Validation Rules
- Username immutable.
- Sharing: role gates; default invite role = editor; merge only if both parties consent (flag).
- Variable actuals must not predate plan start_date; end_date closes planning window.
- FixedExpense category=Loan requires tenure_months (for UI display).
- FutureBomb preparedness_ratio must be 0–1.
- Theme state: red tier requires justification note on variable overspend actions.

## Open Questions (minor)
- Activity retention period and PII redaction policy.
- Whether to store partial payment breakdowns per bill line item vs aggregate (proposed: aggregate, extend later if needed).

