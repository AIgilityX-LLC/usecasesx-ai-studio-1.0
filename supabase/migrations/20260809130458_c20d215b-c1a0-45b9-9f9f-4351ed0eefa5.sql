CREATE OR REPLACE FUNCTION public.workspace_member_directory(_workspace_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text,
  joined_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id,
         COALESCE(p.full_name, split_part(COALESCE(p.email, ''), '@', 1), 'Teammate') AS full_name,
         p.email,
         m.role,
         m.joined_at
    FROM public.workspace_members m
    LEFT JOIN public.profiles p ON p.user_id = m.user_id
   WHERE m.workspace_id = _workspace_id
     AND public.user_in_workspace(auth.uid(), _workspace_id)
   ORDER BY m.joined_at NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public.workspace_member_directory(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workspace_member_directory(uuid) TO authenticated, service_role;

-- Names for attribution of notes, assignments and activity (workspace peers only).
CREATE OR REPLACE FUNCTION public.workspace_display_names(_workspace_id uuid, _user_ids uuid[])
RETURNS TABLE (user_id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id,
         COALESCE(p.full_name, split_part(COALESCE(p.email, ''), '@', 1), 'Teammate') AS full_name
    FROM public.profiles p
   WHERE p.user_id = ANY(_user_ids)
     AND public.user_in_workspace(auth.uid(), _workspace_id);
$$;

REVOKE EXECUTE ON FUNCTION public.workspace_display_names(uuid, uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workspace_display_names(uuid, uuid[]) TO authenticated, service_role;