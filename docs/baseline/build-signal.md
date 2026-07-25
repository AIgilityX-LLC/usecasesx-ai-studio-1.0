# Build & test signal (T=0)

The baseline is documentation-only, so no builds or tests were executed as
part of this turn. To capture the signal against the pinned baseline,
run the commands below and paste output back into this file under
"Recorded runs".

## Recommended verification commands

| Purpose | Command |
|---|---|
| Lint | `bun run lint` |
| Typecheck | `tsgo` |
| Production build | `bun run build` |
| Route tree verify (runs inside build) | `bun run verify:routes` |
| Nav integrity | `bun run check:nav-integrity` |
| End-to-end suites | `bun run test:e2e` |
| Production smoke | `bun run test:smoke` |
| RLS isolation | `bun run test:rls` |
| Mobile responsive | `bun run test:mobile` |
| Navbar spec | `bun run test:navbar` |

## Recorded runs

_None yet — populate when the baseline is verified._

```
date:
lint:
tsgo:
build:
test:e2e:
test:rls:
```
