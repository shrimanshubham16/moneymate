# Phase 6 — Component-wise Implementation Plan (MoneyMate)

## Guiding Principles
- Build in vertical slices: API + data + UI for each feature.
- Keep shared tokens/models in `shared/`; enforce parity across mobile/web.
- Tests per slice: unit (logic), integration (API), UI tests, plus contract fixtures.

## Build Order (High-Level)
1) Foundations: auth, theming tokens, shared types
2) Planning data: income, fixed, variable (plans + actuals)
3) Health/constraint engine + dashboard summaries
4) Alerts + justification flows
5) Investments + SIP enforcement
6) Future bombs + preparedness
7) Sharing/merge flows
8) Credit cards/loans
9) Activities/audit

## Backend Components (NestJS)
- Auth module: signup/login/refresh, username immutability, JWT guard
- User/theme module: theme state, preferences
- Planning module: income, fixed, variable, actuals; monthly_equiv calc; validation (overspend/justification on red)
- Health module: snapshot aggregation, cache, as_of support
- Constraint module: score state, decay job, overspend hook
- Alerts module: rules engine (overspend, missed sip/investment, future bomb), idempotent per period
- Investments module: CRUD, pause/resume, missed detection
- Future-bombs module: preparedness calc, savings contributions
- Sharing module: invites, approvals, roles (owner/editor/viewer), merge_finances flag
- Debts module: credit cards, payments; loans derived from fixed category=Loan
- Activity module: append-only log
- Queue/Scheduler: decay, missed SIP checks, future bomb checks

Backend checkpoints
- Unit: health calc, constraint scoring (overspend + decay), preparedness, SIP calc
- Integration: planning CRUD + validation; dashboard as_of deterministic responses; alerts idempotency
- Contract: OpenAPI generation; schema validation via Zod DTOs

## Web (React) Components
- Shell: routing, theme provider (health-based + manual override), auth guard
- Shared: tokens, typography, buttons, cards, badges, inputs, toasts
- Dashboard: health card, constraint badge with tier, variable/fixed cards, alerts card, future bomb prep meter, investments card, activities list
- Planning: income list/form; fixed form with frequency/SIP toggle; variable plans with actuals modal (red tier requires justification)
- Alerts: list, filter, resolve
- Sharing: invites, member list, merge toggle
- Future bombs: detail with savings add, preparedness meter
- Credit cards: bill view, payments
- Activities: feed with entity/action tags

Web checkpoints
- Unit: helpers for currency, month progress, preparedness; constraint badge logic
- Component tests (React Testing Library): dashboard rendering by state; variable overspend justification path
- E2E (later): happy paths for plan → add actual → dashboard update; invite → accept → merged view

## Mobile (Flutter) Components
- Shell: theming with tokens; navigation scaffold; auth guard
- Shared widgets: cards, badges, pill chips, CTA buttons; Lottie/animated icons optional
- Dashboard: health ring, constraint pill, variable/fixed/investment/future bomb cards, alerts banner, activity feed
- Planning: forms with frequency pickers; variable actuals bottom sheet with justification when red
- Alerts: list + resolve
- Sharing: invites, member roles, merge toggle; account switcher
- Future bombs: preparedness meter, add savings
- Credit cards/loans: bills and payments

Mobile checkpoints
- Unit: formatters, month progress, preparedness
- Widget tests: dashboard states; variable actual bottom sheet validation
- Integration (later): API wiring with mocked backend

## Shared / Cross-Cutting
- shared models (TS/JSON schemas) for API contracts
- design tokens JSON for Flutter + CSS vars for web
- error and loading states standardized

## Data & State
- Cache dashboard/health per owner_ref; invalidate on writes
- Keep deterministic “as_of” for tests/demos
- Role enforcement in client routes (viewer vs editor actions)

## Risks & Mitigations
- Drift between web/mobile: use shared tokens and contract tests
- Constraint justification UX friction: keep note optional unless red & overspend; autosave drafts
- Alert spam: idempotent per period; batching notifications
- Performance: paginate lists; debounce live recalcs on client; server caching

## Sequenced Milestones
- M1: Auth + planning (income/fixed/variable) end-to-end on web; health snapshot basic; tests green
- M2: Constraint score + alerts + justification flow; cache health; tests
- M3: Investments/SIP + future bombs preparedness; alerts hooked; tests
- M4: Sharing/merge; role checks; tests
- M5: Credit cards/loans; activities; tests
- M6: Mobile parity for core flows; shared tokens finalized

