# Phase 1 — Architecture & Tech Stack (MoneyMate)

## Goals
- Multi-platform (Android/iOS/Web) with a single design language.
- Deterministic, auditable financial logic; scalable and testable services.
- Component-by-component delivery; avoid monoliths.

## Stack Choices (with rationale)
- Mobile: Flutter (rich animations, shared UI kit, strong theming).
- Web: React + Vite (fast DX, aligns with Flutter design system via tokens).
- Backend: TypeScript (Node) with NestJS (modular, DI, testing-friendly) over Express.
- API style: REST-first for clients; optional GraphQL gateway later for aggregation.
- DB: PostgreSQL (financial-grade consistency, strong relational modeling).
- Cache/queue: Redis (caching) + optional RabbitMQ (async alerts, recalcs).
- Auth: Email/password with JWT access + refresh tokens; ready for OAuth later.
- Infra: Containerized (Docker), deployable to cloud (k8s or ECS); CDN for assets.
- Observability: OpenTelemetry traces, structured logs, metrics; feature flags via config service.

## High-Level Architecture (textual)
```
Clients (Flutter, Web)
   │
   ▼
API Gateway / BFF (NestJS HTTP)
   │  ├─ Auth module (JWT, email login)
   │  ├─ Planning module (expenses/income/investments/SIP)
   │  ├─ Dashboard module (health snapshot, constraint score)
   │  ├─ Alerts module (overspend, SIP miss, future bomb)
   │  ├─ Sharing module (invites, approvals, roles)
   │  └─ Theme module (health-based + manual)
   │
   ▼
Core Services (NestJS modular)
   ├─ Domain: Users, SharedAccounts, Incomes, Fixed/VariableExpenses, Investments,
   │          CreditCards/Loans, FutureBombs, Activities, Alerts, ConstraintScore,
   │          MonthlyHealthSnapshot, ThemeState
   ├─ Financial Logic: frequency → monthly equivalents, SIP enforcement,
   │                   overspend detection, constraint scoring, health calc
   ├─ Scheduler: cron/queue for recalcs, alerts, SIP checks
   ├─ Notifications: email/push webhooks (abstracted)
   └─ Audit/Activity: append-only log
   │
   ▼
Persistence
   ├─ PostgreSQL (primary store)
   ├─ Redis (cache: health snapshots, dashboards)
   └─ Object storage (design assets if needed)
```

## Module Boundaries (NestJS)
- `auth`: signup/login, JWT, username immutability.
- `users`: profile, preferences, theme state.
- `sharing`: invites, approvals, roles (owner/admin/editor/viewer).
- `planning`: incomes, fixed/variable expenses, categories, SIP flags, frequencies.
- `investments`: investments + SIP enforcement.
- `debts`: credit cards, loans (derived from fixed expenses where category=Loan).
- `future-bombs`: liabilities with preparedness scoring.
- `dashboard`: health snapshot aggregation and caching.
- `alerts`: rules engine + delivery.
- `activity`: audit log for all state changes.

## Data & Calculation Notes
- Frequency → monthly equivalence in DB layer (stored as canonical monthly values + raw frequency).
- Health calculation: income − fixed (100%) − variable (prorated by month progress). Categories Good/OK/Not Well/Worrisome per PRD.
- Constraint score: driven by overspend patterns; decays per approved model (see clarifications).
- Preparedness: saved/required ratio; thresholds to be confirmed.
- All formulas deterministic; version calculations for auditability.

## API Contract Direction (Phase 4 placeholder)
- REST endpoints per module; idempotent PUT/PATCH for updates.
- Dashboard endpoint accepts `as_of` date for deterministic health.
- Alerts endpoint paginated and filterable by severity/type.
- Sharing endpoints with role/permission checks.

## Data Schema Direction (outline)
- `users(id, email, username, created_at, theme_mode, preferences_json)`
- `shared_accounts(id, name)`
- `shared_account_members(shared_account_id, user_id, role)`
- `incomes(id, user_id/shared_account_id, source, amount, frequency, start_date, end_date)`
- `expenses_fixed(id, user_id/shared_account_id, name, amount, frequency, category, start_date, end_date, is_sip_flag)`
- `expenses_variable(id, user_id/shared_account_id, name, planned, category, start_date, end_date)`
- `variable_actuals(id, expense_variable_id, amount, incurred_at)`
- `investments(id, user_id/shared_account_id, name, amount, status, frequency)`
- `future_bombs(id, user_id/shared_account_id, name, due_date, total_amount, preparedness, monthly_equivalent)`
- `alerts(id, user_id/shared_account_id, type, severity, message, period, state)`
- `constraint_scores(id, user_id/shared_account_id, score, tier, recent_overspends, as_of)`
- `activities(id, user_id, entity_type, entity_id, action, payload, created_at)`

## Performance & Scalability
- Cache dashboard/health snapshots in Redis; invalidate on writes.
- Async queue for alert generation and SIP checks to keep writes fast.
- Use read replicas for analytics-heavy queries if needed.
- Pagination everywhere; avoid N+1 with joins and indexes.

## Security & Compliance
- HTTPS everywhere; JWT rotation via refresh tokens.
- Row-level ownership checks on every request; role-based gates for sharing.
- Audit log for all mutations.
- PII minimization in logs; config-driven redaction.

## Testing Strategy
- Unit: formula correctness (health, SIP equivalents, constraint scoring).
- Integration: API modules with Postgres test DB.
- Contract: OpenAPI/Swagger for REST; schema validation with Zod.
- E2E (later): mobile/web flows against staging.

## Open Items (needs stakeholder sign-off)
- Constraint score weights/decay.
- Preparedness thresholds and lead-time behavior.
- SIP recommendation formula specifics.
- Animation/state transition requirements for themes and health indicator.
- Sharing role defaults and edit permissions.

