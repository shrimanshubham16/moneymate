# Decision Log — Phase 1 Sign-offs (MoneyMate)

| Item | Proposed Default | Options Considered | Impact (UX/Eng/Risk) | Decision | Owner | Date |
| --- | --- | --- | --- | --- | --- | --- |
| Constraint score model | Overspend adds fixed +5; decay 5%/month; tiers green 0-39, amber 40-69, red 70+ | Alt: magnitude+count with 10% decay; custom | UX: clearer tiers; Eng: simpler calc; Risk: may underweight large overspends | Approved (per user) | Stakeholder | YYYY-MM-DD |
| Future bomb preparedness thresholds | Warn <70%, critical <40%; stricter when due ≤60 days | Alt: 80/50 without lead-time; custom | UX: proactive warnings; Eng: lead-time logic; Risk: fewer surprises | Approved (per user) | Stakeholder | YYYY-MM-DD |
| SIP recommendation for >monthly | monthlyEquivalent = totalAmount / monthsUntilDue; SIP = monthlyEquivalent; missed SIP raises constraint score | Alt: cap at 10% income; custom | UX: straightforward; Eng: simple; Risk: may exceed comfort if large | Approved (per user) | Stakeholder | YYYY-MM-DD |
| Sharing roles & merging finances | Roles: owner (all), editor (CRUD finances), viewer (read-only); new invite default=editor; add “merge finances” option for relationship use-cases | Alt: owner/admin/editor/viewer with viewer default; custom | UX: collaborative; Eng: add merge flow; Risk: permissions clarity for merged | Approved (per user) | Stakeholder | YYYY-MM-DD |
| Theme/alert intensification | Amber: subtle darkening + stronger copy; Red: strong darkening + justification note on variable overspend; no hard blocks | Alt: copy-only amber; red with confirmation modal | UX: behavioral nudge; Eng: theme states + notes; Risk: avoid blocking flows | Approved (per user) | Stakeholder | YYYY-MM-DD |

Notes:
- Replace YYYY-MM-DD with actual approval date.
- Apply these in Phase 2+ (data models, formulas, APIs, UX). 

