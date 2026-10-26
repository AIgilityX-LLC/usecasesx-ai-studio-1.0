# Gitleaks summary (redacted)

Scanned: full git history (`gitleaks detect --log-opts=--all`, 2651 commits). **Secret values are not stored in this file.**

| Metric | Value |
| ------ | ----- |
| Findings | 29 |

## By rule

- `generic-api-key`: 22
- `jwt`: 7

## By file

- `.env`: 29

## Findings (type / file / commit only)

| Type | File | Commit |
| ---- | ---- | ------ |
| generic-api-key | `.env` | 0e9b9940f06f |
| generic-api-key | `.env` | 0e9b9940f06f |
| generic-api-key | `.env` | 40a2ff6c83e7 |
| generic-api-key | `.env` | 40a2ff6c83e7 |
| generic-api-key | `.env` | bbd93c1f297d |
| generic-api-key | `.env` | bbd93c1f297d |
| generic-api-key | `.env` | eff9731b0a25 |
| generic-api-key | `.env` | eff9731b0a25 |
| generic-api-key | `.env` | 15201644816d |
| generic-api-key | `.env` | 15201644816d |
| generic-api-key | `.env` | 6cb261f82c86 |
| generic-api-key | `.env` | 6cb261f82c86 |
| generic-api-key | `.env` | 06f47de9ba06 |
| generic-api-key | `.env` | 06f47de9ba06 |
| generic-api-key | `.env` | 93c89898647b |
| generic-api-key | `.env` | 93c89898647b |
| jwt | `.env` | c486878f7cbf |
| jwt | `.env` | c486878f7cbf |
| generic-api-key | `.env` | b0c544b07eb7 |
| generic-api-key | `.env` | b0c544b07eb7 |
| jwt | `.env` | 5a6aad7b5d30 |
| jwt | `.env` | 5a6aad7b5d30 |
| jwt | `.env` | ccbbb0e9e64f |
| generic-api-key | `.env` | ccbbb0e9e64f |
| generic-api-key | `.env` | ccbbb0e9e64f |
| jwt | `.env` | 2f5118ebd59b |
| jwt | `.env` | 2f5118ebd59b |
| generic-api-key | `.env` | f158df69ebaf |
| generic-api-key | `.env` | f158df69ebaf |

Human follow-up: historical `.env` material in git history — rotate any keys that remain valid; keep `.env` untracked.
