# Policy model

Aggregate type: **`SovereigntyPolicy`** (`version: 1`).

## Domain policies

### Data — `DataResidencyPolicy` + `RetentionPolicy`

| Field | Meaning |
| ----- | ------- |
| `permittedRegions` / `prohibitedRegions` | Opaque region tokens |
| `residencyPreference` | Soft preferred region |
| `crossBorder` | `unrestricted` \| `permit_list_only` \| `deny_prohibited` \| `deny_by_default` |
| `defaultClassification` / `classificationsBoundToRegion` | Classification tokens |
| `retentionDays` / `deletionGraceDays` / `classificationOverrides` | Retention & deletion |
| `requireDeletionConfirmation` | Tenant wipe confirmation |

### Identity — `IdentitySovereigntyPolicy`

Approved identity providers · customer SSO required · local account restrictions · allowed email domains.

### AI — `AIProviderPolicy`

Permitted / prohibited providers · permitted model regions · prompts may leave deployment region · customer data external use · local/private model option.

### Storage — `StorageSovereigntyPolicy`

Permitted storage providers · private-only buckets · tenant storage namespace (+ pattern).

### Cryptography — `EncryptionPolicy`

Platform-managed keys · customer-managed key capability · future BYOK capability · `keyManagementMode`.

### Operations — `AdministratorAccessPolicy`

Privileged admin limits · support-access logging required · break-glass (duration, reason, **impersonationAllowed: false** by default).

### Audit — `AuditSovereigntyPolicy`

Required events · export · retention period · customer access.

### Exit — `ExportPolicy`

Complete customer export · tenant deletion · portability formats · include audit/evidence.

## Named exports

`SovereigntyPolicy`, `DataResidencyPolicy`, `AIProviderPolicy`, `RetentionPolicy`, `EncryptionPolicy`, `AdministratorAccessPolicy`, `ExportPolicy` (+ identity / storage / audit companions used inside the aggregate).
