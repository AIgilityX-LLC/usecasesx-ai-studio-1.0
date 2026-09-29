# UseCasesX™ V2 — Core ERD (V2-04)

**Date:** 2026-09-23  
**Companion:** [`data-dictionary.md`](./data-dictionary.md)

```mermaid
erDiagram
  organizations ||--o{ workspaces : owns
  workspaces ||--o{ opportunities : hosts
  workspaces ||--o{ ai_use_cases : hosts
  workspaces ||--o{ use_case_boards : hosts

  use_case_boards ||--o{ ai_use_cases : contains
  opportunities ||--o{ opportunity_versions : versions
  opportunities ||--o| ai_use_cases : converts_to
  ai_use_cases ||--o{ use_case_versions : versions
  ai_use_cases ||--o{ use_case_canvas_sections : canvas
  use_case_versions ||--o{ use_case_canvas_sections : snapshot_sections

  opportunities {
    uuid id PK
    uuid workspace_id
    uuid organization_id
    text lifecycle_status
    timestamptz deleted_at
    uuid current_version_id FK
  }

  opportunity_versions {
    uuid id PK
    uuid opportunity_id FK
    int version
    text kind
    jsonb snapshot
    uuid workspace_id
    uuid organization_id
  }

  ai_use_cases {
    uuid id PK
    uuid board_id FK
    uuid workspace_id
    uuid organization_id
    text status
    text lifecycle_status
    int version
    jsonb wizard_state
    timestamptz deleted_at
    uuid current_version_id FK
  }

  use_case_versions {
    uuid id PK
    uuid use_case_id FK
    int version
    text kind
    jsonb snapshot
    uuid workspace_id
    uuid organization_id
  }

  use_case_canvas_sections {
    uuid id PK
    uuid use_case_id FK
    uuid version_id FK "null = draft"
    text section_key
    jsonb content
    timestamptz deleted_at
    uuid workspace_id
    uuid organization_id
  }
```

## Adapt vs create

| Keep / adapt | New in V2-04 | Deferred |
|--------------|--------------|----------|
| `opportunities`, `ai_use_cases`, `use_case_versions` | `opportunity_versions`, `use_case_canvas_sections`, `studio-canvas` bucket | evidence, scorecard versions, decisions, value contracts, agents |

## Workshop canvas (unchanged SoR)

`workshop_public_value_canvas`, `workshop_canvas_versions`, `workshop_canvas_documents` remain the workshop path. Studio Canvas V2 uses `use_case_canvas_sections` — same product, different bounded context; no rename.
