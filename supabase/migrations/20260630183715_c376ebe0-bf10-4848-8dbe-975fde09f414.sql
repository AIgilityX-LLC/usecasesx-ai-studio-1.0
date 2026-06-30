
ALTER TABLE public.ai_use_cases
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_use_case_id uuid REFERENCES public.use_cases(id) ON DELETE SET NULL;

-- Backfill positions per board based on existing creation order.
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY board_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.ai_use_cases
)
UPDATE public.ai_use_cases u
SET position = o.rn
FROM ordered o
WHERE u.id = o.id;

-- Prevent the same catalog use case from being added to the same board twice.
CREATE UNIQUE INDEX IF NOT EXISTS ai_use_cases_board_source_unique
  ON public.ai_use_cases (board_id, source_use_case_id)
  WHERE source_use_case_id IS NOT NULL;
