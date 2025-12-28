# M6 — Mobile Parity Plan (Flutter) for MoneyMate

## Goals
- Feature parity with web: auth, planning (income/fixed/variable + actuals), dashboard health/constraint, alerts, investments/SIP, future bombs, sharing/merge, credit cards/loans, activity log.
- Reuse design tokens and logic; deterministic `as_of` support for testing.
- Offline-tolerant reads (cache last dashboard); graceful error states.

## Architecture
- Flutter app, null-safe Dart.
- State mgmt: Riverpod or Bloc (prefer Riverpod for simplicity).
- HTTP: `dio` with interceptors for auth token.
- Env: base URL `http://localhost:12022` for local; injectable for staging/prod.
- Theming: map design tokens to `ThemeData`; support health-based themes + manual override; respect `prefers-reduced-motion`.
- Routing: `go_router` or `Navigator 2.0`; authenticated shell + public auth routes.
- Storage: `shared_preferences` for tokens and last-dashboard cache.

## Screens / Components
- Auth: signup/login, immutable username note.
- Dashboard: health card, constraint badge, alerts, variable/fixed cards, investments, future bombs, credit cards, loans, activity feed.
- Planning:
  - Income list/add/edit.
  - Fixed expenses add/edit (frequency, category, SIP flag).
  - Variable plans list/add/edit; actuals add (with red-tier justification enforcement).
- Investments: list/add/edit; pause/resume.
- Future bombs: list/add/edit; preparedness meter.
- Sharing: invites (role, merge toggle), incoming/outgoing requests, members list.
- Credit cards: list, pay bill (partial payments), show due/paid.
- Loans: list (derived/entered), show EMI/tenure.
- Activity: timeline view with entity badges.

## Data / Clients
- API client wrapping backend endpoints from web parity (auth, planning, dashboard, alerts, sharing, debts, activity).
- DTOs in `lib/api/models`, code-gen optional; minimal manual models acceptable for M6.
- Reuse health/constraint logic server-side; client only displays.

## Testing Strategy (regression & integration)
- Unit: view-models for dashboard, constraint badge logic, justification gating.
- Integration: mock HTTP with `http_mock_adapter` or `dio_mock_adapter`; flows:
  - Auth → dashboard load (as_of deterministic).
  - Add income/variable plan/actual (red-tier justification rejected without note).
  - Investments/future bombs lists render from fixtures.
  - Sharing invite/approve happy path mocked.
  - Credit card payment updates paid amount and activity feed.
- Golden (optional): key widgets (health card, alerts list).
- Device targets: iOS/Android; ensure no platform-specific blockers (e.g., date formatting).

## Navigation / UX Notes
- Pull-to-refresh on dashboard lists.
- Error toasts/snackbars with retry.
- Skeleton/loading states for dashboard and lists.
- Forms: numeric keyboards for amounts; date pickers for due dates; checkbox for merge finances.
- Red-tier overspend: justification text field required on submit; show constraint tier badge inline.

## Data Sources for Demo/Tests
- Use backend seed (`/admin/seed`) and fixtures already present; for emulator, ensure backend reachable at LAN/localhost with port 12022 (may need host mapping).
- Provide an “as_of” debug setting to keep health deterministic.

## Implementation Steps
- Setup Flutter project under `mobile/` with packages: `dio`, `riverpod`, `go_router`, `shared_preferences`, `intl`.
- Implement auth flow + token storage.
- Implement dashboard fetch & render; add pull-to-refresh.
- Implement planning forms and actuals with justification rule.
- Implement investments/future bombs screens.
- Implement sharing screens (invites, incoming, members).
- Implement credit cards pay + activity feed.
- Add tests for flows using mocked HTTP.

## Risks / Mitigations
- Network access from emulator to localhost: document port/host config.
- State drift: centralize API client and model parsing; reuse tokens.
- Animation load: honor reduced motion; keep transitions light.

