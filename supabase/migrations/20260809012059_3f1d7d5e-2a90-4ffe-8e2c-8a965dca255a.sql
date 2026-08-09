CREATE TABLE IF NOT EXISTS public.workspace_export_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  export_key text NOT NULL,
  columns text[] NOT NULL DEFAULT '{}',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, export_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_export_preferences TO authenticated;
GRANT ALL ON public.workspace_export_preferences TO service_role;

ALTER TABLE public.workspace_export_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read export preferences"
  ON public.workspace_export_preferences FOR SELECT TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Workspace members create export preferences"
  ON public.workspace_export_preferences FOR INSERT TO authenticated
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Workspace members update export preferences"
  ON public.workspace_export_preferences FOR UPDATE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id))
  WITH CHECK (public.user_in_workspace(auth.uid(), workspace_id));

CREATE POLICY "Workspace members delete export preferences"
  ON public.workspace_export_preferences FOR DELETE TO authenticated
  USING (public.user_in_workspace(auth.uid(), workspace_id));

DROP TRIGGER IF EXISTS trg_workspace_export_preferences_updated ON public.workspace_export_preferences;
CREATE TRIGGER trg_workspace_export_preferences_updated
  BEFORE UPDATE ON public.workspace_export_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.audit_portfolio_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'portfolio_item', NEW.portfolio_id, 'portfolio_item.added',
            jsonb_build_object('use_case_id', NEW.use_case_id, 'decision', NEW.decision, 'rank', NEW.rank,
                               'delivery_stage', NEW.delivery_stage, 'delivery_owner', NEW.delivery_owner));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value, new_value)
    VALUES (uid, 'portfolio_item', NEW.portfolio_id, 'portfolio_item.updated',
            jsonb_build_object('decision', OLD.decision, 'rank', OLD.rank, 'funding_state', OLD.funding_state,
                               'target_period', OLD.target_period, 'delivery_stage', OLD.delivery_stage,
                               'planned_start_date', OLD.planned_start_date, 'planned_end_date', OLD.planned_end_date,
                               'milestone', OLD.milestone, 'delivery_owner', OLD.delivery_owner,
                               'blocked_reason', OLD.blocked_reason, 'depends_on', to_jsonb(OLD.depends_on)),
            jsonb_build_object('use_case_id', NEW.use_case_id, 'decision', NEW.decision, 'rank', NEW.rank,
                               'funding_state', NEW.funding_state, 'target_period', NEW.target_period,
                               'delivery_stage', NEW.delivery_stage,
                               'planned_start_date', NEW.planned_start_date, 'planned_end_date', NEW.planned_end_date,
                               'milestone', NEW.milestone, 'delivery_owner', NEW.delivery_owner,
                               'blocked_reason', NEW.blocked_reason, 'depends_on', to_jsonb(NEW.depends_on)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value)
    VALUES (uid, 'portfolio_item', OLD.portfolio_id, 'portfolio_item.removed',
            jsonb_build_object('use_case_id', OLD.use_case_id, 'decision', OLD.decision,
                               'delivery_stage', OLD.delivery_stage));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;