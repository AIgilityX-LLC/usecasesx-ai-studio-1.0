delete from public.cta_events
where utm_source = 'verify_run'
   or search_query = 'defect detection'
   or (cta in ('cta_clicked','search_used') and utm_source is null and created_at < '2026-08-11 09:12:00+00');