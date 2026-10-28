# RLS hardening rollback — `20261028180000_rls_telemetry_and_role_hardening.sql`

Apply **only** if the additive migration must be reversed on a TEST project.
Do not run against production without an explicit change ticket.

```sql
-- Reverse: restore prior admin-manage-roles + own-log policies (pre-hardening shape).

DROP POLICY IF EXISTS "Super admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view their own roles" ON public.user_roles;

CREATE POLICY "Users view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Restore pre-hardening unrestricted telemetry inserts (legacy names).
DROP POLICY IF EXISTS "Log own view" ON public.use_case_views;
CREATE POLICY "Anyone log view"
  ON public.use_case_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Log own download" ON public.use_case_downloads;
CREATE POLICY "Anyone log download"
  ON public.use_case_downloads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Log own integration event" ON public.integration_events;
CREATE POLICY "Anyone log integration event"
  ON public.integration_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);
```

Note: This rollback restores the **post-20260707** “Log own …” shape, not the older
`"Anyone log …" WITH CHECK (true)` policies. Do not reintroduce unrestricted inserts.
