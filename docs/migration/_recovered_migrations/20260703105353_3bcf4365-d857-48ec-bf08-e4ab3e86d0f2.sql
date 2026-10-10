
ALTER TABLE public.taxonomy_sectors
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Backfill status from legacy is_published flag
UPDATE public.taxonomy_sectors SET status = 'published' WHERE is_published = true AND status = 'draft';

-- Validation trigger: keep is_published in sync with status
CREATE OR REPLACE FUNCTION public.sync_sector_published()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_published := (NEW.status = 'published' OR NEW.status = 'featured');
  IF NEW.status IN ('published','featured') AND NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_sector_published ON public.taxonomy_sectors;
CREATE TRIGGER trg_sync_sector_published
BEFORE INSERT OR UPDATE ON public.taxonomy_sectors
FOR EACH ROW EXECUTE FUNCTION public.sync_sector_published();

-- Org members can read their organization's sectors (private org repositories)
DROP POLICY IF EXISTS "Org members read org sectors" ON public.taxonomy_sectors;
CREATE POLICY "Org members read org sectors"
ON public.taxonomy_sectors
FOR SELECT
TO authenticated
USING (organization_id IS NOT NULL AND organization_id = public.user_org_id(auth.uid()));

-- Editors can submit sectors for their org (pending approval)
DROP POLICY IF EXISTS "Editors submit org sectors" ON public.taxonomy_sectors;
CREATE POLICY "Editors submit org sectors"
ON public.taxonomy_sectors
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_editor_tier(auth.uid())
  AND organization_id = public.user_org_id(auth.uid())
  AND submitted_by = auth.uid()
);
