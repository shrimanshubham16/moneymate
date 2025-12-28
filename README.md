# MoneyMate (Finance Partner App)

MoneyMate is the production-grade finance management app described in `docs/prd/Finance Partner App.docx` and driven by the authoritative prompt in `docs/prompts/Finance Partner App prompt.docx`. Follow the phased execution model—no scope reductions from the PRD.

## Repository Layout
- `docs/prd/` — Product requirements (authoritative PRD).
- `docs/prompts/` — Build prompt and guardrails.
- `docs/architecture/` — Architecture outputs (Phase 1).
- `planning/phase-0-understanding/` — PRD analysis, risks, ambiguities.
- `planning/phase-1-architecture/` — Architecture diagrams and stack decisions.
- `planning/phase-2-data-models/` — Entities, schemas, relationships.
- `planning/phase-3-constraint-logic/` — Formulas, scoring, SIP/frequency logic.
- `planning/phase-4-api-contracts/` — REST/GraphQL specs, schemas.
- `planning/phase-5-ux-design/` — Design system, themes, wireframes.
- `planning/phase-6-implementation/` — Component breakdown, build order, tests.
- `mobile/ios`, `mobile/android` — Native mobile targets.
- `web/` — Web application.
- `backend/` — APIs and server-side logic.
- `shared/` — Cross-platform models/utilities.

## Phased Execution (do not skip or merge)
1) Phase 0: Understand and validate PRD; log ambiguities, dependencies, risks.  
2) Phase 1: Architecture and tech stack with rationale and diagrams.  
3) Phase 2: Data models and domain design (fields, relationships, lifecycles).  
4) Phase 3: Financial intelligence and constraint logic (explicit formulas + examples).  
5) Phase 4: API contracts for auth/planning/dashboard/alerts/sharing/themes.  
6) Phase 5: UX system, themes, animations, dashboard states and transitions.  
7) Phase 6: Component-wise implementation plan, build order, and test checkpoints.

## Working Principles
- No hallucination; ask when information is missing and record assumptions.
- Component-by-component; no monolithic coding.
- Performance, scalability, and rich UI are first-class requirements.
- Constraints and scoring are core features, not add-ons.

## Next Step
Proceed with Phase 0: analyze the PRD, summarize entities/workflows/non-negotiables, and capture ambiguities, dependencies, and risks before designing anything.

