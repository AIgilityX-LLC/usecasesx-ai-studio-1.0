CREATE TABLE public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  client_name text,
  objective text,
  business_functions text[] NOT NULL DEFAULT '{}',
  starts_on date,
  ends_on date,
  stage text NOT NULL DEFAULT 'context',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workshop_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  user_id uuid,
  display_name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'participant',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX workshop_participants_user_uniq
  ON public.workshop_participants (workshop_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX workshop_participants_workshop_idx ON public.workshop_participants (workshop_id);

CREATE TABLE public.workshop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'pain_point',
  title text NOT NULL,
  detail text,
  business_function text,
  submitted_by uuid,
  submitted_by_name text,
  status text NOT NULL DEFAULT 'submitted',
  merged_into_id uuid REFERENCES public.workshop_items(id) ON DELETE SET NULL,
  source_item_id uuid REFERENCES public.workshop_items(id) ON DELETE SET NULL,
  opportunity_id uuid,
  use_case_id uuid,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workshop_items_workshop_idx ON public.workshop_items (workshop_id, kind);

CREATE TABLE public.workshop_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.workshop_items(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL,
  criterion text NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, voter_id, criterion)
);
CREATE INDEX workshop_votes_workshop_idx ON public.workshop_votes (workshop_id);

CREATE TABLE public.workshop_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL UNIQUE REFERENCES public.workshops(id) ON DELETE CASCADE,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_outcomes TO authenticated;
GRANT ALL ON public.workshops TO service_role;
GRANT ALL ON public.workshop_participants TO service_role;
GRANT ALL ON public.workshop_items TO service_role;
GRANT ALL ON public.workshop_votes TO service_role;
GRANT ALL ON public.workshop_outcomes TO service_role;

CREATE OR REPLACE FUNCTION public.workshop_is_facilitator(_workshop_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workshops w
    WHERE w.id = _workshop_id
      AND (
        w.created_by = _user_id
        OR public.org_role(_user_id, w.organization_id) IN ('owner','admin')
        OR EXISTS (
          SELECT 1 FROM public.workshop_participants p
          WHERE p.workshop_id = w.id AND p.user_id = _user_id AND p.role = 'facilitator'
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.workshop_is_member(_workshop_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.workshop_is_facilitator(_workshop_id, _user_id)
    OR EXISTS (
      SELECT 1 FROM public.workshop_participants p
      WHERE p.workshop_id = _workshop_id AND p.user_id = _user_id
    )
$$;

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop members read workshops" ON public.workshops
  FOR SELECT TO authenticated USING (public.workshop_is_member(id, auth.uid()));
CREATE POLICY "Workspace members create workshops" ON public.workshops
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.user_in_workspace(auth.uid(), workspace_id));
CREATE POLICY "Facilitators update workshops" ON public.workshops
  FOR UPDATE TO authenticated USING (public.workshop_is_facilitator(id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(id, auth.uid()));
CREATE POLICY "Facilitators delete workshops" ON public.workshops
  FOR DELETE TO authenticated USING (public.workshop_is_facilitator(id, auth.uid()));

CREATE POLICY "Workshop members read participants" ON public.workshop_participants
  FOR SELECT TO authenticated USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Facilitators manage participants" ON public.workshop_participants
  FOR ALL TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));

CREATE POLICY "Workshop members read items" ON public.workshop_items
  FOR SELECT TO authenticated USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Workshop members submit items" ON public.workshop_items
  FOR INSERT TO authenticated
  WITH CHECK (public.workshop_is_member(workshop_id, auth.uid()) AND submitted_by = auth.uid());
CREATE POLICY "Authors edit unreviewed items" ON public.workshop_items
  FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid() AND status = 'submitted')
  WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "Facilitators curate items" ON public.workshop_items
  FOR UPDATE TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));
CREATE POLICY "Facilitators delete items" ON public.workshop_items
  FOR DELETE TO authenticated USING (public.workshop_is_facilitator(workshop_id, auth.uid()));

CREATE POLICY "Workshop members read votes" ON public.workshop_votes
  FOR SELECT TO authenticated USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Members cast own votes" ON public.workshop_votes
  FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Members change own votes" ON public.workshop_votes
  FOR UPDATE TO authenticated USING (voter_id = auth.uid()) WITH CHECK (voter_id = auth.uid());
CREATE POLICY "Members withdraw own votes" ON public.workshop_votes
  FOR DELETE TO authenticated USING (voter_id = auth.uid());

CREATE POLICY "Workshop members read outcomes" ON public.workshop_outcomes
  FOR SELECT TO authenticated USING (public.workshop_is_member(workshop_id, auth.uid()));
CREATE POLICY "Facilitators write outcomes" ON public.workshop_outcomes
  FOR ALL TO authenticated
  USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
  WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));

CREATE TRIGGER trg_workshops_org BEFORE INSERT ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.sync_board_org();
CREATE TRIGGER trg_workshops_updated BEFORE UPDATE ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workshop_items_updated BEFORE UPDATE ON public.workshop_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workshop_votes_updated BEFORE UPDATE ON public.workshop_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workshop_outcomes_updated BEFORE UPDATE ON public.workshop_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
