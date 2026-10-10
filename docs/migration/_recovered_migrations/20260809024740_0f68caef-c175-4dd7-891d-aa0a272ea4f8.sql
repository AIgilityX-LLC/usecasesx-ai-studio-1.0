ALTER TABLE public.use_case_benefits
  ADD COLUMN IF NOT EXISTS evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS erp_verification_status text NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS erp_system text,
  ADD COLUMN IF NOT EXISTS erp_reference text,
  ADD COLUMN IF NOT EXISTS erp_last_verified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'use_case_benefits_erp_status_chk'
  ) THEN
    ALTER TABLE public.use_case_benefits
      ADD CONSTRAINT use_case_benefits_erp_status_chk
      CHECK (erp_verification_status IN ('not_configured','pending','verified','failed'));
  END IF;
END$$;

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
                               'evidence_links', NEW.evidence_links,
                               'erp_verification_status', NEW.erp_verification_status,
                               'erp_system', NEW.erp_system,
                               'erp_reference', NEW.erp_reference,
                               'erp_last_verified_at', NEW.erp_last_verified_at,
                               'verification_method', NEW.verification_method));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value, new_value)
    VALUES (uid, 'use_case_benefit', NEW.use_case_id,
            CASE
              WHEN NEW.erp_verification_status IS DISTINCT FROM OLD.erp_verification_status
                THEN 'benefit.verification_changed'
              WHEN NEW.evidence_links IS DISTINCT FROM OLD.evidence_links
                THEN 'benefit.evidence_changed'
              ELSE 'benefit.updated'
            END,
            jsonb_build_object('benefit_id', OLD.id, 'name', OLD.name, 'category', OLD.category,
                               'unit_type', OLD.unit_type, 'currency', OLD.currency, 'period', OLD.period,
                               'baseline_value', OLD.baseline_value, 'target_value', OLD.target_value,
                               'expected_value', OLD.expected_value, 'confidence', OLD.confidence,
                               'state', OLD.state, 'benefit_owner', OLD.benefit_owner,
                               'measurement_frequency', OLD.measurement_frequency,
                               'evidence_source', OLD.evidence_source,
                               'evidence_links', OLD.evidence_links,
                               'erp_verification_status', OLD.erp_verification_status,
                               'erp_system', OLD.erp_system,
                               'erp_reference', OLD.erp_reference,
                               'erp_last_verified_at', OLD.erp_last_verified_at,
                               'verification_method', OLD.verification_method),
            jsonb_build_object('benefit_id', NEW.id, 'name', NEW.name, 'category', NEW.category,
                               'unit_type', NEW.unit_type, 'currency', NEW.currency, 'period', NEW.period,
                               'baseline_value', NEW.baseline_value, 'target_value', NEW.target_value,
                               'expected_value', NEW.expected_value, 'confidence', NEW.confidence,
                               'state', NEW.state, 'benefit_owner', NEW.benefit_owner,
                               'measurement_frequency', NEW.measurement_frequency,
                               'evidence_source', NEW.evidence_source,
                               'evidence_links', NEW.evidence_links,
                               'erp_verification_status', NEW.erp_verification_status,
                               'erp_system', NEW.erp_system,
                               'erp_reference', NEW.erp_reference,
                               'erp_last_verified_at', NEW.erp_last_verified_at,
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
