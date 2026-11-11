-- Decisions (approve/hold/reject/conditions/changes) and closing open items
-- are only written by the permission-checked server workflow (service role).
DROP POLICY IF EXISTS "Workspace editors update gate reviews" ON public.decision_gate_reviews;
CREATE POLICY "Workspace editors update gate reviews"
  ON public.decision_gate_reviews FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id)
         AND status IN ('draft', 'submitted', 'in_review', 'changes_requested'))
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id)
              AND status IN ('draft', 'submitted', 'in_review'));

DROP POLICY IF EXISTS "Workspace editors insert gate reviews" ON public.decision_gate_reviews;
CREATE POLICY "Workspace editors insert gate reviews"
  ON public.decision_gate_reviews FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id)
              AND status IN ('draft', 'submitted'));

DROP POLICY IF EXISTS "Workspace editors insert gate events" ON public.decision_gate_events;
CREATE POLICY "Workspace editors insert gate events"
  ON public.decision_gate_events FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id) AND action = 'submit');

DROP POLICY IF EXISTS "Workspace editors insert gate open items" ON public.decision_gate_open_items;
CREATE POLICY "Workspace editors insert gate open items"
  ON public.decision_gate_open_items FOR INSERT TO authenticated
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id) AND status = 'open');

DROP POLICY IF EXISTS "Workspace editors update gate open items" ON public.decision_gate_open_items;
CREATE POLICY "Workspace editors update gate open items"
  ON public.decision_gate_open_items FOR UPDATE TO authenticated
  USING (public.workspace_can_edit(auth.uid(), workspace_id) AND status = 'open')
  WITH CHECK (public.workspace_can_edit(auth.uid(), workspace_id) AND status = 'open');
