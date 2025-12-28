# Phase 5 — UX System & Design Language (MoneyMate)

## Design Principles
- Emotion-forward but non-shaming; positive reinforcement first.
- Consistency across mobile (Flutter) and web (React) via shared tokens.
- State-aware themes tied to health/constraint; smooth, reversible transitions.
- Accessibility: WCAG AA contrast, motion-reduced fallbacks, clear affordances.

## Design Tokens (starter set)
- Colors:
  - Success/Good: #0F9D58; Warning: #F59E0B; Critical: #B91C1C; Neutral: #0F172A.
  - Backgrounds: surface #FFFFFF, muted #F8FAFC, card #FFFFFF, border #E2E8F0.
  - Themes: Good (greens), Amber (warm), Red/Worrisome (deep reds), Storm (dark slate).
- Typography: Inter/Roboto 14–20 body, 24–32 display; weights 400/600/700.
- Radius: 12–16 card, 8 buttons; Shadows: subtle 4/8.
- Spacing scale: 4, 8, 12, 16, 24, 32.
- Motion: 200–350ms ease-out; reduce motion option respects OS setting.

## Themes & States
- Health-based (auto):
  - Good: green accents, light backgrounds, gentle pulse on health badge.
  - OK: warm neutrals, minimal motion.
  - Not Well: muted red accents, subtle warning iconography.
  - Worrisome (red tier): darkened background overlay, stronger contrast; requires justification on overspend actions.
- Manual themes: Thunderstorms (dark slate with lightning accents), Reddish Dark Knight, Green Zone. Users can override auto; constraint tier still influences microcopy emphasis.

## Dashboard States (wireframe specs)
- Empty: CTA “Plan Your Finances” primary, secondary “Import/Share”. Show benefit bullets.
- Planned (normal): Cards grid: Health, Constraint Score, Variable, Fixed, Investments, Future Bombs, Alerts, Dues, Current Month Expenses, Activities.
- Overspend detected: Alerts card elevated (border + icon), Variable card shows overspend tags; amber theme cues.
- Worrisome: Health card dominant with clear remaining/shortfall; red theme; justification prompt on add-actual if over plan.
- Interactions: all cards tappable/clickable to detail screens; pull-to-refresh (mobile) and refresh CTA (web).

## Microcopy & Behavioral Nudges
- Good: “You’re ahead. Keep the pace.”
- OK: “Track your spends to stay in the green.”
- Not Well: “Tighten a bit. Shift some variable spends.”
- Worrisome: “You’re short. Add notes on any extra spend.” (red requires justification note for variable overspend)
- Future bomb warnings: “Underprepared for {name}. Add ₹X/mo to stay safe.”
- Constraint amber: “Spending pattern is tightening. Review variable categories.”
- Constraint red: “Discipline required. Add a note for extra spend.”

## Key Flows (high level)
- Plan fixed/variable: simple forms; frequency picker; SIP toggle for >monthly.
- Add variable actual: show plan vs actual; if tier=red and over plan → justification note required.
- Investments: pause/resume with confirmation; missed alerts surfaced in Alerts.
- Future bombs: show preparedness meter; add savings contribution; severity per thresholds.
- Sharing: invite with role + merge toggle; show members list and roles.

## Accessibility & Performance
- Minimum hit targets 44px; focus states visible; form labels persistent.
- Color contrast AA; avoid color-only status (use icons/text).
- Motion reduced: disable pulses and heavy transitions when prefers-reduced-motion is on.
- Prefer lazy loading for lower-priority cards; cache dashboard payloads.

## Open Minor Items
- Exact animation cues per theme (recommend: opacity+scale 1.02 on hover/tap; pulse on health only in Good).
- Haptic feedback on mobile for critical alerts (toggleable).
- Empty-state illustrations style (line vs filled). 

