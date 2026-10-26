# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main` (pre-release / RC) | Yes — active development |
| Tagged releases (`v*`) | Yes while listed as current in `CHANGELOG.md` |
| Historical branches / forks | No |

UseCasesX™ has not cut a general-availability versioned release yet. Until the first tagged GA cut, security fixes land on `main` via pull request only.

## Reporting a vulnerability

**Do not open a public GitHub issue for security findings.**

Please report privately:

1. Prefer GitHub Security Advisories → *Report a vulnerability* on this repository (when enabled — see `docs/process/github-settings.md`).
2. Otherwise email: **TODO: replace with security contact address** (`security@…` or engagement-specific mailbox).

Include: affected surface (route, server function, migration, policy), reproduction steps without exploiting third-party tenants, impact assessment, and whether a fix is proposed.

We aim to acknowledge within **5 business days** and to coordinate disclosure after a fix or mitigating control is available.

## Non-goals of this document

This file is an intake policy only. Technical controls live in `docs/security/security-baseline.md`. Do not treat this page as a compliance attestation.
