DELETE FROM public.use_case_metrics a
USING public.use_case_metrics b
WHERE a.ctid > b.ctid
  AND a.use_case_id = b.use_case_id
  AND a.label = b.label
  AND a.sort_order IS NOT DISTINCT FROM b.sort_order;