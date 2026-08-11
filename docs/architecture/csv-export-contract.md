# CSV export contract — reports

Status: **locked**. Downstream spreadsheets, finance models and partner
integrations bind to these files, so the shape below is a contract, not an
implementation detail.

Source of truth: `src/lib/reports/report-model.ts`
(`USE_CASE_CSV_COLUMNS`, `BENEFIT_CSV_COLUMNS`, `toCsvCell`,
`buildUseCasesCsv`, `benefitsToCsv`). Tests:
`tests/unit/report-csv-contract.test.ts`.

## Change rules

1. **Column keys never change or get renamed.** A key is a permanent
   identifier.
2. **Ordering is fixed.** New columns are appended at the end only.
3. **Never remove a column.** A retired column emits an empty value.
4. Labels (the header row text) may be reworded for clarity; keys may not.
5. Any change to the frozen lists must update the test snapshot in the same
   change, which is the review gate.

## Stable identifiers

| Column               | Meaning                                                         |
| -------------------- | --------------------------------------------------------------- |
| `use_case_id`        | Repository use case UUID. Empty when the slug has not resolved. |
| `slug`               | Repository slug. Always present; the stable human key.          |
| `studio_use_case_id` | Linked AI Use Case Studio™ draft UUID, via studio lineage.      |
| `benefit_id`         | Benefit row UUID from the Studio value register.                |

## Escaping rules

- Delimiter: `,` (comma). Row terminator: `\r\n` (CRLF), including between the
  header and the first row. No trailing newline.
- A cell is quoted **only** when it contains `"`, `,`, CR or LF.
- Inside a quoted cell, `"` is doubled (`""`).
- `null` and `undefined` render as an empty cell — never `null`, `undefined`
  or `—`. The em dash is a screen-only affordance.
- Numbers are written unformatted (no thousands separators, no currency
  symbol); the currency lives in its own `currency` column.
- Files are written UTF-8 with a BOM so Excel opens them correctly.

## Use case export — column order

`usecasex-<report-kind>-<YYYY-MM-DD>.csv`

```text
use_case_id, slug, studio_use_case_id, title, industry, business_function,
ai_capability, value_potential, complexity, risk_level, time_to_value,
score_strategic, score_value, score_feasibility, score_ttv, score_risk,
score_governance, score_total, priority_band, decision, funding_state,
delivery_stage, target_period, planned_start, planned_end, milestone, owner,
blocked_reason, next_action, benefit_count, benefits_evidenced, gaps
```

`gaps` is a `|`-joined list of the data gaps detected at generation time.

## Benefits export — column order

`usecasex-<report-kind>-benefits-<YYYY-MM-DD>.csv`

```text
use_case_id, slug, benefit_id, name, category, unit_type, currency, period,
baseline_value, target_value, expected_value, confidence, state,
benefit_owner, erp_verification, evidence_count
```

## Access

Both CSV exports are gated by `canExportReport` in
`src/lib/reports/report-access.ts`: `owner`, `admin`, `contributor` and
`facilitator` may export; `viewer` and non-members receive an access denied
error. Every attempt — permitted or denied — writes an `export.generated`
audit event.
