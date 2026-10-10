CREATE TABLE public.workshop_canvas_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('mandate','beneficiaries','baseline','outcomes','ai_versus_alternatives','authority_and_redress','sovereignty')),
  label TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  note TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_canvas_documents_workshop ON public.workshop_canvas_documents (workshop_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_canvas_documents TO authenticated;
GRANT ALL ON public.workshop_canvas_documents TO service_role;

ALTER TABLE public.workshop_canvas_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop members read canvas documents"
ON public.workshop_canvas_documents FOR SELECT TO authenticated
USING (public.workshop_is_member(workshop_id, auth.uid()));

CREATE POLICY "Facilitators attach canvas documents"
ON public.workshop_canvas_documents FOR INSERT TO authenticated
WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Facilitators update canvas documents"
ON public.workshop_canvas_documents FOR UPDATE TO authenticated
USING (public.workshop_is_facilitator(workshop_id, auth.uid()))
WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()));

CREATE POLICY "Facilitators remove canvas documents"
ON public.workshop_canvas_documents FOR DELETE TO authenticated
USING (public.workshop_is_facilitator(workshop_id, auth.uid()));

CREATE TRIGGER update_workshop_canvas_documents_updated_at
BEFORE UPDATE ON public.workshop_canvas_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workshop_canvas_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  completeness INTEGER NOT NULL DEFAULT 0,
  answered INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workshop_id, version)
);

CREATE INDEX idx_canvas_versions_workshop ON public.workshop_canvas_versions (workshop_id, version DESC);

GRANT SELECT, INSERT ON public.workshop_canvas_versions TO authenticated;
GRANT ALL ON public.workshop_canvas_versions TO service_role;

ALTER TABLE public.workshop_canvas_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshop members read canvas versions"
ON public.workshop_canvas_versions FOR SELECT TO authenticated
USING (public.workshop_is_member(workshop_id, auth.uid()));

CREATE POLICY "Facilitators record canvas versions"
ON public.workshop_canvas_versions FOR INSERT TO authenticated
WITH CHECK (public.workshop_is_facilitator(workshop_id, auth.uid()) AND created_by = auth.uid());
