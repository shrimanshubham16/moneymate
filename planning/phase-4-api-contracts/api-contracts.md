# Phase 4 — API Contracts (MoneyMate)

Conventions
- REST, JSON; all responses wrap `{ data, meta? }` except errors.
- Auth: Bearer access token; refresh for renewal.
- Idempotent updates via PUT/PATCH; pagination via `page/limit`.
- Dates in ISO8601 UTC; amounts in paise (int).
- owner_ref resolved server-side (user or shared account), enforcing roles.

Auth
- POST /auth/signup { email, password, username }
- POST /auth/login { email, password } -> { access_token, refresh_token }
- POST /auth/refresh { refresh_token } -> { access_token }
- GET /auth/me -> user profile, theme state

Planning (income/expenses)
- GET /planning/income -> list
- POST /planning/income { source, amount, frequency, start_date?, end_date? }
- PUT /planning/income/:id { ...same fields... }
- DELETE /planning/income/:id
- GET /planning/fixed-expenses
- POST /planning/fixed-expenses { name, amount, frequency, category, start_date, end_date, is_sip_flag }
- PUT /planning/fixed-expenses/:id { ... }
- DELETE /planning/fixed-expenses/:id
- GET /planning/variable-expenses -> plans with rolled actuals
- POST /planning/variable-expenses { name, planned, category, start_date, end_date }
- PUT /planning/variable-expenses/:id { ... }
- DELETE /planning/variable-expenses/:id
- POST /planning/variable-expenses/:id/actuals { amount, incurred_at, justification? } (justification required if constraint tier=red and overspend)
- GET /planning/variable-expenses/:id/actuals

Investments & SIP
- GET /investments
- POST /investments { name, amount, frequency, status }
- PUT /investments/:id { ... }
- POST /investments/:id/pause
- POST /investments/:id/resume
- Alerts on missed SIP/investment use constraint score + lead time

Credit Cards / Loans
- GET /debts/credit-cards
- POST /debts/credit-cards { name, statement_date, due_date, bill_amount }
- POST /debts/credit-cards/:id/payments { amount, paid_at }
- GET /debts/loans (derived from fixed expenses category=Loan)

Future Bombs
- GET /future-bombs
- POST /future-bombs { name, due_date, total_amount }
- PUT /future-bombs/:id { ... }
- POST /future-bombs/:id/savings { amount, saved_at }
- Preparedness severity per approved rules (warn<70%, critical<40%, due<=60d escalate)

Dashboard
- GET /dashboard?as_of=ISO -> { health { remaining, category }, constraint_score, summaries { income, fixed, variable_prorated }, alerts_open }
- Health uses monthly equivalents + prorated variable per phase-3 formulas

Alerts
- GET /alerts?type=&severity=&state=
- POST /alerts/:id/resolve { note? }
- Idempotent per owner_ref + period + type

Sharing
- GET /sharing/requests (incoming/outgoing)
- POST /sharing/invite { email_or_username, role (editor/viewer), merge_finances?: bool }
- POST /sharing/requests/:id/approve
- POST /sharing/requests/:id/reject
- GET /sharing/members -> list with roles, merge_finances flags
- DELETE /sharing/members/:id

Themes
- GET /themes/state -> { mode: health_auto|manual, selected_theme, constraint_tier_effect }
- PATCH /themes/state { mode?, selected_theme? }

Activity
- GET /activity?entity_type=&entity_id=&actor=&page=&limit=
- Records auth, CRUD on financial entities, sharing changes, alerts, justification notes.

Schemas (selected, request)
- Income: { source, amount:int, frequency:monthly|quarterly|yearly, start_date?:ISO, end_date?:ISO }
- FixedExpense: { name, amount:int, frequency, category, start_date, end_date, is_sip_flag?:bool }
- VariableActual: { amount:int, incurred_at:ISO, justification?:string }
- FutureBomb: { name, due_date:ISO, total_amount:int }
- SavingsAdd: { amount:int, saved_at:ISO }
- Invite: { email_or_username, role, merge_finances?:bool }

Responses (shape)
- Standard: { data: <resource|array>, meta?: { page, limit, total } }
- Error: { error: { code, message, details? } }

Security / Permissions
- Role gates: owner/editor can mutate; viewer read-only; merge requires consent.
- All endpoints authorize owner_ref membership; reject cross-tenant access.

Open Minor Items
- Rate limiting policy per IP/user.
- Pagination defaults (proposed: limit 20, max 100).
- Whether to expose justification text in Activity for viewers (privacy). 

