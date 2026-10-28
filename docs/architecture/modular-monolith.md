# Phase 5 — Selective modular monolith restructuring

**Status:** Active architecture target  
**Decision:** Modular monolith with strict domain boundaries — **not** microservices.  
**Code SoT:** `src/lib/modules/` (catalogue, layers, boundary rules)  
**ADR:** `docs/adr/0005-modular-monolith-not-microservices.md`

---

## Why not microservices (yet)

Microservices buy independent deployability and team isolation at the cost of
distributed transactions, cross-service auth, operational overhead, and slower
product iteration. UseCasesX is one product with one tenancy model and one
release train. A **modular monolith** gives clear seams without that headache.
Extract a service later only when a domain has proven independent scale, team,
or compliance needs.

---

## Target shape

```text
┌───────────────────────────────────────────┐
│             UseCasesX Web UI              │
│       React / TypeScript / Design         │
└─────────────────┬─────────────────────────┘
                  │
              API / BFF
         (TanStack Start server fns
          + /api/public/* routes)
                  │
┌─────────────────▼─────────────────────────┐
│          Application Services             │
├───────────────────────────────────────────┤
│ Identity & Tenant                         │
│ Discovery Studio                          │
│ Use Case Management                       │
│ Scoring Engine                            │
│ Portfolio Management                      │
│ Value Management                          │
│ KPI / Benefit Tracking                    │
│ Workflow & Approvals                      │
│ Collaboration                             │
│ AI Matching                               │
│ Reporting                                 │
│ Integrations                              │
│ Audit                                     │
└─────────────────┬─────────────────────────┘
                  │
┌─────────────────▼─────────────────────────┐
│ Domain / Policy / Rules Layer             │
│  (domain kernel, authz, lifecycle,        │
│   fair-use, tenant policy)                │
└─────────────────┬─────────────────────────┘
                  │
┌─────────────────▼─────────────────────────┐
│ Data / Queue / Storage / AI Adapters      │
│  (Supabase, storage, AI gateway)          │
└───────────────────────────────────────────┘
```

Layer enum + ranking: `src/lib/modules/layers.ts`.  
Dependencies may only go **sideways (declared)** or **down**.

---

## Selective restructuring (what this phase does / does not)

| Do | Do not |
| -- | ------ |
| Name each application service and the paths it owns today | Mass-move every file into new packages in one PR |
| Encode entry points + allowed `dependsOn` in the catalogue | Spin up separate deploys / databases / queues per domain |
| Keep BFF = server fns + public routes | Introduce a second HTTP framework or Nest-style microservice scaffold |
| Prefer new code under owning paths | Rewrite working journeys “for purity” without tests |

Machine-readable ownership: `MODULE_CATALOGUE` in `src/lib/modules/catalogue.ts`.

---

## Layer mapping in this repo

| Layer | UseCasesX reality |
| ----- | ----------------- |
| Web UI | `src/routes/`, `src/components/`, hooks |
| API / BFF | `createServerFn` (`*.functions.ts`), `src/routes/api/public/*` — see `src/lib/modules/bff.ts` |
| Application services | Domain folders under `src/lib/` mapped in the catalogue |
| Domain / Policy / Rules | `src/lib/domain/*` kernel, `src/lib/authz/*`, `src/lib/lifecycle/`, fair-use / tenant policy |
| Adapters | `src/integrations/supabase/`, `src/lib/ai/*server*`, `src/lib/storage/` |

---

## Boundary rules

1. **UI** talks to the BFF (server fns / loaders) — not to adapter clients for launch-critical writes.
2. **BFF** handlers stay thin; business rules live in application or domain_policy modules.
3. **Application** modules call each other only through declared `dependsOn` + public entry points.
4. **Domain / policy** never imports React routes or components.
5. **Adapters** never import application feature modules.
6. Tenant scope is membership-derived (`Identity & Tenant`) — never a client-supplied `tenant_id`.
7. One codebase for Lite / Pro / Enterprise — entitlements differentiate, not forks.

Enforcement helpers: `validateCatalogueLayers`, `isAllowedModuleDependency`, `packagingDecision()` in `src/lib/modules/boundaries.ts`.

---

## Maturity (honest)

Most application services are **partial**: logic exists and is usable, but folders still share history with peers. Scoring, AI gateway adapters, portfolio repositories, and the domain kernel are closer to **established**. Extraction of remaining concentrations (admin screens, collections, report repos) stays on the backlog in `docs/architecture/domain-boundaries.md` — do them when coverage and product freeze allow.

---

## Verification

```bash
bun test tests/unit/modular-monolith.test.ts
```

Related: `docs/architecture/domain-boundaries.md`, `docs/architecture/architecture-principles.md`, `docs/architecture/enterprise-multi-tenancy.md` (Phase 4).
