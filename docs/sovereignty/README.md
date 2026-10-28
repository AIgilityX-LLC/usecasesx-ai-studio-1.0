# UseCasesX Sovereignty Control Plane

**Code:** `src/lib/sovereignty/control-plane/`  
**Facade:** `SovereigntyControlPlane`  
**Related:** Phase 8 architecture dimensions · Phase 9 deployment profiles · V2-18 tenant policy bridge

| Doc | Purpose |
| --- | ------- |
| [architecture.md](./architecture.md) | Control-plane shape, non-goals, call-site rules |
| [policy-model.md](./policy-model.md) | `SovereigntyPolicy` and domain policy types |
| [evaluation.md](./evaluation.md) | How decisions are produced (no statute hardcoding) |
| [packs.md](./packs.md) | Configurable policy packs vs jurisdiction law |

## Quick start

```ts
import { SovereigntyControlPlane } from "@/lib/sovereignty";

const policy = SovereigntyControlPlane.defaultPolicy(orgId);
const decision = SovereigntyControlPlane.evaluate(policy, {
  type: "ai_invocation",
  request: { provider: "default", promptLeavesRegion: false },
});
if (!SovereigntyControlPlane.isAllowed(decision)) {
  // deny with decision.reason / decision.clause
}
```

**Rule:** Do not hardcode jurisdiction-specific law into business logic. Configure region / provider / classification **tokens** in policy packs; map statutes in advisory or customer packs outside the evaluator.
