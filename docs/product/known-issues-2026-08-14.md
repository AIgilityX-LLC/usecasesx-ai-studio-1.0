# Known issues — 14 August 2026 release

Only issues that are actually observed or verified are listed. Nothing here is speculative and
nothing observed has been omitted. Scoped to candidate **v1.0.0-rc.1** (release marker
`release/2026-08-14`).

| #   | Issue                                                                                                                                            | Impact | Class                                  | Mitigation / status                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Pilot evidence is empty.** No invitations, checkpoint answers, AI events or reports recorded, so the launch verdict cannot be evidence-backed. | High   | P1 (No-Go effect on the evidence gate) | Run the 15–25 seat cohort from Administration → Pilot programme, then read the triage panel. Until then the verdict is _No-Go on evidence_. |
| 2   | **Browser P0 suite does not run in the build sandbox** (Playwright browsers are not installed there).                                            | Medium | P1                                     | CI workflow `launch-readiness.yml` runs the browser suites; CI is the source of truth for browser evidence.                                 |
| 3   | **Launch-learning aggregates depend on weekly views**, so a metric can lag until the current week rolls up.                                      | Low    | P2                                     | Triage tolerates the lag: aggregation failures degrade to an empty section instead of a wrong number.                                       |
| 4   | **Repository breadth is limited to the seeded reference set** (54 published use cases), so niche queries can return nothing.                     | Low    | Education / content                    | Zero-result queries are surfaced in the triage panel and answered with content, not code.                                                   |
| 5   | **Search relevance is lexical**, not semantic; synonyms and abbreviations may miss.                                                              | Low    | P2                                     | Facets narrow results; post-launch improvement, not a launch blocker.                                                                       |

## Deliberately deferred (out of scope for 14 August)

- Enterprise-only roles and capabilities beyond the launch role set.
- Billing and paid plan enforcement (Founding Access is complimentary, fair-use limited).
- Semantic/vector search and AI-assisted repository recommendations.
