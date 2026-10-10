CREATE UNIQUE INDEX IF NOT EXISTS use_case_metrics_uc_label_sort_uidx
  ON public.use_case_metrics (use_case_id, label, sort_order);
