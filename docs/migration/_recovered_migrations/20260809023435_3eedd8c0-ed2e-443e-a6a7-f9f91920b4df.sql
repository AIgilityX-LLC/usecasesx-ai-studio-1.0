CREATE TABLE public.use_case_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id uuid NOT NULL REFERENCES public.ai_use_cases(id) ON DELETE CASCADE,
  workspace_id uuid,
  organization_id uuid,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'cost_reduction',
  kpi text,
  unit_type text NOT NULL DEFAULT 'currency',
  currency text,
  period text NOT NULL DEFAULT 'annual',
  baseline_value numeric,
  target_value numeric,
  expected_value numeric,
  confidence text NOT NULL DEFAULT 'medium',
  measurement_frequency text NOT NULL DEFAULT 'quarterly',
  benefit_owner text,
  evidence_source text,
  state text NOT NULL DEFAULT 'proposed',
  verification_method text NOT NULL DEFAULT 'manual',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT use_case_benefits_unit_type_check CHECK (unit_type IN ('currency','hours','fte','percent','count','other')),
  CONSTRAINT use_case_benefits_period_check CHECK (period IN ('one_off','monthly','quarterly','annual')),
  CONSTRAINT use_case_benefits_confidence_check CHECK (confidence IN ('low','medium','high')),
  CONSTRAINT use_case_benefits_state_check CHECK (state IN ('proposed','approved','delivered','verified','sustained')),
  CONSTRAINT use_case_benefits_frequency_check CHECK (measurement_frequency IN ('monthly','quarterly','biannual','annual','ad_hoc')),
  CONSTRAINT use_case_benefits_category_check CHECK (category IN ('cost_reduction','revenue_growth','productivity','risk_reduction','quality','customer_experience','compliance','sustainability','other')),
  CONSTRAINT use_case_benefits_verification_check CHECK (verification_method IN ('manual','erp_automated')),
  CONSTRAINT use_case_benefits_currency_required CHECK (unit_type <> 'currency' OR currency IS NOT NULL)
);

CREATE INDEX idx_use_case_benefits_use_case ON public.use_case_benefits(use_case_id);
CREATE INDEX idx_use_case_benefits_workspace ON public.use_case_benefits(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.use_case_benefits TO authenticated;
GRANT ALL ON public.use_case_benefits TO service_role;

ALTER TABLE public.use_case_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members access use case benefits"
ON public.use_case_benefits
FOR ALL
TO authenticated
USING (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()))
WITH CHECK (public.user_can_access_use_case(auth.uid(), use_case_id) OR public.is_admin_tier(auth.uid()));

CREATE TRIGGER trg_use_case_benefits_tenancy
BEFORE INSERT ON public.use_case_benefits
FOR EACH ROW EXECUTE FUNCTION public.sync_tenancy_from_ai_use_case();

CREATE TRIGGER trg_use_case_benefits_updated
BEFORE UPDATE ON public.use_case_benefits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.audit_use_case_benefits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'use_case_benefit', NEW.use_case_id, 'benefit.created',
            jsonb_build_object('benefit_id', NEW.id, 'name', NEW.name, 'category', NEW.category,
                               'unit_type', NEW.unit_type, 'currency', NEW.currency, 'period', NEW.period,
                               'baseline_value', NEW.baseline_value, 'target_value', NEW.target_value,
                               'expected_value', NEW.expected_value, 'confidence', NEW.confidence,
                               'state', NEW.state, 'benefit_owner', NEW.benefit_owner,
                               'measurement_frequency', NEW.measurement_frequency,
                               'evidence_source', NEW.evidence_source,
                               'verification_method', NEW.verification_method));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value, new_value)
    VALUES (uid, 'use_case_benefit', NEW.use_case_id, 'benefit.updated',
            jsonb_build_object('benefit_id', OLD.id, 'name', OLD.name, 'category', OLD.category,
                               'unit_type', OLD.unit_type, 'currency', OLD.currency, 'period', OLD.period,
                               'baseline_value', OLD.baseline_value, 'target_value', OLD.target_value,
                               'expected_value', OLD.expected_value, 'confidence', OLD.confidence,
                               'state', OLD.state, 'benefit_owner', OLD.benefit_owner,
                               'measurement_frequency', OLD.measurement_frequency,
                               'evidence_source', OLD.evidence_source,
                               'verification_method', OLD.verification_method),
            jsonb_build_object('benefit_id', NEW.id, 'name', NEW.name, 'category', NEW.category,
                               'unit_type', NEW.unit_type, 'currency', NEW.currency, 'period', NEW.period,
                               'baseline_value', NEW.baseline_value, 'target_value', NEW.target_value,
                               'expected_value', NEW.expected_value, 'confidence', NEW.confidence,
                               'state', NEW.state, 'benefit_owner', NEW.benefit_owner,
                               'measurement_frequency', NEW.measurement_frequency,
                               'evidence_source', NEW.evidence_source,
                               'verification_method', NEW.verification_method));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value)
    VALUES (uid, 'use_case_benefit', OLD.use_case_id, 'benefit.removed',
            jsonb_build_object('benefit_id', OLD.id, 'name', OLD.name, 'expected_value', OLD.expected_value,
                               'unit_type', OLD.unit_type, 'currency', OLD.currency, 'state', OLD.state));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE TRIGGER audit_use_case_benefits_trg
AFTER INSERT OR UPDATE OR DELETE ON public.use_case_benefits
FOR EACH ROW EXECUTE FUNCTION public.audit_use_case_benefits();
