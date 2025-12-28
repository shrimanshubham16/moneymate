# MoneyMate Mobile (Flutter) — Parity Scaffold

This folder contains a minimal Flutter scaffold to reach parity with the web/backend features. It includes:
- `pubspec.yaml` with `http`, `shared_preferences`, `intl`
- `lib/models.dart` aligned to backend/web models
- `lib/api_client.dart` for REST calls to backend (`http://localhost:12022` by default)
- `lib/main.dart` with basic auth gate, dashboard fetch, credit cards/loans display

Status
- No Flutter SDK installed in this environment; code not built or tested here.
- Uses deterministic `as_of` date (2025-01-15T00:00:00Z) for dashboard.

Next steps to run locally
1) Install Flutter SDK (3.19+ recommended).
2) `cd mobile && flutter pub get`
3) Update `baseUrl` in `api_client.dart` if using a non-local backend.
4) Run backend on `12022` (`npm run dev` in `backend/`).
5) `flutter run` (emulator/simulator); ensure emulator can reach host (use host machine IP if needed).

Feature coverage in scaffold
- Auth (signup/login), token storage
- Dashboard: health, constraint, alerts, investments, future bombs
- Debts: credit cards (list/pay), loans (list)
- Activity: list

Not yet wired in this scaffold (planned):
- Planning CRUD (income/fixed/variable/actuals with justification)
- Sharing flows (invites/approvals)
- UI polish, themes, and accessibility per UX spec
- Tests (widget/unit with mocked HTTP)

