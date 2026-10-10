-- Wire audit_events for use_cases lifecycle (create / publish / archive / delete).
-- Complements existing audit_use_case_boards() trigger so admin activity on
-- the global catalog is traceable.

CREATE OR REPLACE FUNCTION public.audit_use_cases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, new_value)
    VALUES (uid, 'use_case', NEW.id, 'use_case.created',
            jsonb_build_object('title', NEW.title, 'slug', NEW.slug, 'status', NEW.status));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status transitions we care about
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value, new_value)
      VALUES (
        uid, 'use_case', NEW.id,
        CASE
          WHEN NEW.status::text = 'published' THEN 'use_case.published'
          WHEN NEW.status::text = 'archived'  THEN 'use_case.archived'
          WHEN NEW.status::text = 'draft'     THEN 'use_case.unpublished'
          ELSE 'use_case.status_changed'
        END,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status, 'title', NEW.title, 'slug', NEW.slug)
      );
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_events(actor_id, entity_type, entity_id, event_type, previous_value)
    VALUES (uid, 'use_case', OLD.id, 'use_case.deleted',
            jsonb_build_object('title', OLD.title, 'slug', OLD.slug, 'status', OLD.status));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_use_cases_ins ON public.use_cases;
DROP TRIGGER IF EXISTS trg_audit_use_cases_upd ON public.use_cases;
DROP TRIGGER IF EXISTS trg_audit_use_cases_del ON public.use_cases;

CREATE TRIGGER trg_audit_use_cases_ins
AFTER INSERT ON public.use_cases
FOR EACH ROW EXECUTE FUNCTION public.audit_use_cases();

CREATE TRIGGER trg_audit_use_cases_upd
AFTER UPDATE ON public.use_cases
FOR EACH ROW EXECUTE FUNCTION public.audit_use_cases();

CREATE TRIGGER trg_audit_use_cases_del
AFTER DELETE ON public.use_cases
FOR EACH ROW EXECUTE FUNCTION public.audit_use_cases();
