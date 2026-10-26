# ADR-0001 — Record architecture decisions

**Status:** Accepted  
**Date:** 2026-10-26  
**Deciders:** Engineering (@Mehtab19)  
**Related:** [`docs/v2/architecture-decisions.md`](../v2/architecture-decisions.md), `AGENTS.md`, Phase 1 control plane  

## Context

UseCasesX already documents V2 decisions in `docs/v2/architecture-decisions.md`. The engineering control plane needs a durable, numbered ADR folder for future cross-cutting choices (branching, deploy, sovereignty, security) without relocating existing V2 material.

## Decision

1. Keep `docs/v2/architecture-decisions.md` as the home for V2-scoped ADRs already accepted.
2. Add `docs/adr/` with this template and numbered files for new decisions.
3. New ADRs that affect V2 product scope must be cross-linked from `docs/v2/architecture-decisions.md` (append a pointer; do not duplicate the full text unless superseding).

## Consequences

- Decision history is discoverable from both the V2 pack and the ADR index.
- No file moves; no rewrite of existing ADRs.
- Contributors use `0000-template.md` for new records.

## Alternatives considered

- Move all V2 ADRs into `docs/adr/` — rejected (move risk; breaks existing links).
- Only use the V2 file forever — rejected (mixes product V2 with repo control-plane decisions).
