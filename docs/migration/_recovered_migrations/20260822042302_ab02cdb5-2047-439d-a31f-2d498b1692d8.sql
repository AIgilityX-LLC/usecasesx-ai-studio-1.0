CREATE OR REPLACE FUNCTION public.prevent_profile_org_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    -- Service role / SECURITY DEFINER membership flows have no auth.uid().
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    -- Platform admins may reassign; a member may only be moved into an org
    -- they already hold an accepted membership row for.
    IF public.is_admin_tier(auth.uid()) THEN
      RETURN NEW;
    END IF;
    IF NEW.organization_id IS NOT NULL
       AND public.is_org_member(NEW.user_id, NEW.organization_id) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'organization_id cannot be changed on your own profile';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_org_change ON public.profiles;
CREATE TRIGGER profiles_guard_org_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_org_self_change();
