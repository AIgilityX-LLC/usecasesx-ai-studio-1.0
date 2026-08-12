# 07 — Pro Launch Features

Four workstreams stand between the current release candidate and a sellable Pro product:
**billing**, **transactional email**, **auth hardening + SSO**, and **closing launch blockers**.
They are independent and can run in parallel by different engineers.

---

## A. Billing and subscriptions (Stripe)

Founding Access is complimentary through **31 December 2026**. Billing must therefore support a
grandfathered zero-price tier alongside paid plans from day one — not replace it.

### Data model (additive migration)

```sql
-- plans are reference data, seeded, not user-writable
create table public.billing_plans (
  id text primary key,                       -- 'lite' | 'pro' | 'enterprise'
  name text not null,
  stripe_product_id text,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  seat_based boolean not null default true,
  entitlements jsonb not null default '{}',  -- capability flags resolved by the entitlement service
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.billing_plans to anon, authenticated;
grant all on public.billing_plans to service_role;
alter table public.billing_plans enable row level security;
create policy "plans are public" on public.billing_plans for select using (is_public);

create table public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_id text not null references public.billing_plans(id),
  status text not null,                      -- trialing|active|past_due|canceled|paused|complimentary
  stripe_customer_id text,
  stripe_subscription_id text,
  seats_purchased integer not null default 1,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  complimentary_until timestamptz,           -- Founding Access: 2026-12-31
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);
grant select on public.workspace_subscriptions to authenticated;
grant all on public.workspace_subscriptions to service_role;
alter table public.workspace_subscriptions enable row level security;
create policy "members read own subscription" on public.workspace_subscriptions
  for select to authenticated using (public.is_workspace_member(auth.uid(), workspace_id));
-- writes are service-role only, from verified Stripe webhooks

create table public.billing_events (            -- append-only
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  stripe_event_id text unique not null,        -- idempotency key
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);
grant all on public.billing_events to service_role;
alter table public.billing_events enable row level security;
```

Never store plan or role state on `profiles`. Entitlements are **derived**: 
`resolveEntitlements(subscription, plan, roles, flags, now)` in `packages/domain/src/authz`, used by
both the API (authoritative) and the web app (display only).

### API endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/public/plans` | public pricing, from `billing_plans` |
| GET | `/v1/workspaces/:id/subscription` | member-readable |
| POST | `/v1/workspaces/:id/billing/checkout` | creates a Stripe Checkout Session; owner/admin only |
| POST | `/v1/workspaces/:id/billing/portal` | Stripe Billing Portal session |
| POST | `/v1/workspaces/:id/billing/seats` | seat quantity change with proration |
| POST | `/v1/hooks/stripe` | webhook; verify signature **before** parsing |

Webhook events to handle: `checkout.session.completed`,
`customer.subscription.{created,updated,deleted,paused,resumed}`,
`invoice.{paid,payment_failed}`. Insert into `billing_events` first and use
`stripe_event_id` uniqueness for idempotency — Stripe retries.

### Enforcement rules

- Entitlement checks happen in the API on every gated operation, not only at render time.
- Grace: `past_due` keeps read access and blocks creation for 14 days, then downgrades to Lite limits.
- Downgrade is non-destructive: data is retained and made read-only, never deleted.
- Complimentary Founding Access resolves to Pro entitlements while `complimentary_until > now()`,
  with no Stripe subscription required.
- Seat counting reads active workspace memberships; invitations count against seats on acceptance.

### Testing

Unit-test `resolveEntitlements` across the matrix (plan × status × complimentary × roles × flags).
Use `stripe listen` against the local API for webhook e2e. Include one full test-mode
checkout → active → seat change → cancel → downgrade run in the pre-launch script.

---

## B. Transactional and auth email

Sender identity is `info@aigilityx.com` (domain `aigilityx.com`); provision a dedicated sending
subdomain such as `notify.aigilityx.com` so marketing DNS and app DNS never collide.

### Provider

Any HTTP email API (Resend, Postmark, SES) called from `apps/api` only. Templates are React Email
components rendered server-side. `packages/domain` holds the *decision* to send; `apps/api` performs it.

### Required emails

| Trigger | Template | Owner |
|---|---|---|
| Sign-up confirmation | `auth-confirm` | Supabase Auth hook → API |
| Password reset | `auth-recovery` | Supabase Auth hook → API |
| Email change | `auth-email-change` | Supabase Auth hook → API |
| Magic link / invite | `auth-invite` | Supabase Auth hook → API |
| Workspace invitation | `workspace-invite` | app event |
| Pilot invitation | `pilot-invite` | replaces the current link-only flow |
| Submission received / published / returned | `submission-status` | app event |
| Evidence-gap watchdog (7-day) | `evidence-gap` | cron |
| Request/feedback SLA breach | `sla-breach` | cron |
| Subscription receipt, payment failed, cancellation | `billing-*` | Stripe webhook |
| Export ready | `export-ready` | job completion |

### Rules

- One recipient per send, triggered by that recipient's action or a specific event for them. No bulk
  or marketing sends from this system.
- Every send records `{ correlationId, template, recipientHash, status, providerId }` in an
  append-only `email_deliveries` table. Log a hash, never the full address.
- Idempotency key derived from the event id + template name so retries don't duplicate.
- Handle bounces/complaints via the provider webhook into a suppression table; a suppressed recipient
  is skipped, not retried.
- DNS: SPF, DKIM, DMARC (`p=quarantine` at minimum) on the sending subdomain. Verify before launch.
- Rate limits: batch invitations at ≤25/hour until the provider reputation is warmed.

### Exit criteria

A real sign-up, a real password reset, a workspace invitation, and a pilot invitation all land in a
live inbox from the canonical host, with DKIM pass and no spam placement. Attach the headers as
evidence to the release record.

---

## C. Auth hardening and SSO

### Baseline hardening

- Enable leaked-password protection (HIBP) and a 12-character minimum.
- Disable anonymous sign-ups. Keep email confirmation on; never auto-confirm in production.
- Session policy: short-lived access tokens with refresh rotation; sign-out clears the query cache,
  cancels in-flight requests, and history-replaces to `/auth`.
- Rate-limit auth endpoints and lock accounts temporarily after repeated failures.
- Store roles only in `user_roles`; every privileged path calls `has_role()`.
- Re-verify identity for sensitive actions (email change, MFA disable, workspace deletion, billing
  changes) with a recent-login requirement.

### MFA (TOTP)

`/mfa` enrolment: QR + secret, verify a code before activating, issue 10 single-use recovery codes
(hashed at rest). Allow workspace owners to require MFA for admin roles. Record enable/disable as
audit events.

### SAML SSO (Enterprise)

- Per-organisation IdP config: metadata URL or certificate, verified email domains, default role on
  first login, optional JIT provisioning.
- Domain-based discovery at `/sso`: user enters an email, the app looks up the domain and redirects
  to the IdP.
- Attribute mapping to `profiles` and `user_roles`; group → role mapping is explicit and audited.
- SCIM deprovisioning is **out of scope for Pro launch** — record it in the deferred register.

### Exit criteria

MFA enrol/verify/recover works; one real IdP (Entra ID or Okta) completes a full round trip on
staging; the authz matrix test suite passes for all five launch roles (Owner, Admin, Contributor,
Viewer, Facilitator).

---

## D. Closing the known launch blockers

Carried from the current release-candidate assessment. These are not new features — they are the
conditions that keep the verdict at NO-GO.

| # | Blocker | Action | Owner |
|---|---|---|---|
| 1 | 36 browser (Playwright) failures; runner unstable | Fix the runner in CI, then triage: fix P0 journey failures, quarantine and ticket the rest with a named owner and date | QA |
| 2 | No credentialed signed-in production run | Provision a dedicated QA account per environment; run the P0 suite authenticated against staging and production | QA |
| 3 | Canonical host not serving the app | Connect `usecasesx.aigilityx.com` + `www`, set the apex as primary, verify redirects, canonical tags, and `og:image` on 10 pages | Tech lead |
| 4 | Sender domain not provisioned; deliverability unmeasured | Workstream B above; attach live-inbox evidence | Tech lead |
| 5 | Demo accounts hold platform roles; 5 demo tenants unflagged | Revoke via the audited remediation path; flag demo tenants; re-run the production-data audit to zero findings | Data owner |
| 6 | Migration 16 contains a `DELETE FROM` | Keep the manifest-keyed exception; add the migration linter so any *new* destructive statement fails CI | Tech lead |
| 7 | Pilot has 0 participants; no waiver recorded | Either enrol 15–25 seats and capture checkpoint evidence, or record a signed launch waiver with the accepted risk | Product |
| 8 | Runbook owners unrecorded (7 roles) | Fill §1 of `docs/operations/launch-runbook-2026-08-14.md` with names + backups | Launch owner |
| 9 | Backups/restore not self-serve | Document the platform support path and rehearse the restore drill quarterly | Data owner |
| 10 | Single AI provider | Accepted risk: AI is assistive and every surface degrades to manual entry. Add a second provider behind the gateway abstraction post-launch | Tech lead |

**Launch gate**: items 1–8 must be closed. 9 and 10 are documented accepted risks with mitigations.
