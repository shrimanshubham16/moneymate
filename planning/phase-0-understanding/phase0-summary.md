# Phase 0 — Understanding & Validation (MoneyMate)

## Core Entities (from PRD v1.1)
- User (email auth, unique immutable username)
- SharedAccount (combined income/expenses across users)
- Income (source, amount, frequency)
- FixedExpense (amount, frequency, category; loans are a category)
- VariableExpense (amount varies; frequency-aware)
- Frequency (drives monthly equivalents)
- SIPForPeriodicExpense (monthly contribution toward non-monthly expense)
- Investment (active/paused, missed alerts)
- CreditCard (bill amount, due, paid status)
- Loan (derived from fixed expenses where category=Loan)
- FutureBomb (future liability with date, total, monthly equivalent, preparedness)
- Activity (log of actions/alerts)
- Alert (overspend, missed investment/SIP, future bomb risk)
- ConstraintScore (discipline score driven by overspend patterns)
- MonthlyHealthSnapshot (health categories Good/OK/Not Well/Worrisome)
- Dues (current month dues across categories)
- ThemeState (health-based or manual theme)

## Core Workflows
- Auth: email signup/login, pick immutable username; future OAuth.
- Plan finances: add/update/delete fixed and variable expenses; mark SIP for >monthly; set frequencies, start/end dates, categories.
- Track spending: add actuals for variable; track paid status for fixed; prorate variable by month progress for health.
- Investments & SIP: add/update/delete, pause/resume, monitor missed SIP/investments.
- Credit cards & loans: track bill amount/due/paid; loans derived from fixed-expense loans with EMI/tenure derivation.
- Future bombs: enter future liabilities; compute monthly equivalent and preparedness; alert when underprepared.
- Dashboard: show planned vs actual, dues, current month expenses, financial health indicator with animations; widgets clickable to detail views.
- Sharing: request/approve/reject; merge shared accounts; filter dashboard by username (phase 2).
- Alerts & constraints: overspend alerts, missed investment/SIP, future bomb risk; overspend increases constraint score, may intensify alerts, darken theme, require justification.
- Themes: auto health-based (worrisome/not well/good) or manual selection (thunderstorms, reddish dark knight, green zone).
- Frequency intelligence: convert >monthly expenses to monthly equivalents; drives health calc, SIP recommendation, future risk; missing SIP increases risk score and future health impact.

## Non-Negotiable Requirements
- No scope reductions vs PRD; behavioral finance and constraint scoring are first-class.
- Phased execution: do not skip or merge phases.
- Rich, modern UI with smooth animations; consistent design across mobile/web.
- Performance and scalability prioritized; deterministic, auditable formulas.
- Component-by-component build; no monolithic coding.
- Health categories and calculation rules exactly as defined.
- Username immutable after creation; email-based auth required.

## Ambiguities / Questions
- Exact data model for constraint score progression (weights, decay?) — needs specification.
- Preparedness metric for future bombs: threshold and formula not defined.
- SIP recommendation logic specifics (how to compute recommended monthly contribution) not detailed.
- Sharing permissions model (who can edit what in shared accounts) needs clarity.
- Theme darkening/alert intensification rules (mapping from constraint score to UI changes) not specified.
- Activity log schema granularity (per field change? per alert?).
- Health indicator animation behavior and state transitions not specified beyond themes.
- Handling partial payments for fixed expenses or credit cards unclear.

## Dependencies
- Frequency calendar logic (month length, leap years) for prorating variable expenses.
- Timezone handling for due dates, future bombs, and monthly boundaries.
- Auth provider choice (email now, OAuth later) influences user identity model.
- Sharing relies on stable user identifiers and invite/approval flow.
- Deterministic formula definitions needed before backend implementation.

## Risks
- Under-specified constraint scoring could lead to inconsistent UX and alerts.
- Ambiguous preparedness logic may under/over-warn on future bombs.
- Cross-platform theme/animation parity can diverge without a shared design system.
- Performance risk if monthly equivalents and health recalcs are done inefficiently on large datasets.
- Data integrity risk for shared accounts if permissions are unclear.
- User trust risk if health indicator flips without transparent calculations.

## Assumptions (call out until confirmed)
- Monthly health snapshot recalculates on each data change or at least daily.
- Constraint score is monotonic with overspend frequency and decays over time unless specified otherwise.
- Preparedness for future bombs is ratio of saved vs required amount; thresholds to be defined.
- Partial payments are allowed for credit cards/loans; unpaid portion counts toward dues.
- Alerts are idempotent per period to avoid spam.

## Next Actions
- Clarify ambiguities above with stakeholders.
- Lock formulas for health, constraint score, preparedness, SIP recommendation.
- Proceed to Phase 1 once formulas and permission model are approved.

