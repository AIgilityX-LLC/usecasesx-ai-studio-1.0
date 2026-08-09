REVOKE EXECUTE ON FUNCTION public.workspace_can_edit(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.workspace_can_manage(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.collab_entity_workspace(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_workspace_invitation(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.workspace_can_edit(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workspace_can_manage(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_entity_workspace(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(text) TO authenticated, service_role;