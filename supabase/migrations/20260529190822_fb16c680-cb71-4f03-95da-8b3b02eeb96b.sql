ALTER TABLE public.use_case_business_objectives
  ADD CONSTRAINT use_case_business_objectives_use_case_id_fkey
    FOREIGN KEY (use_case_id) REFERENCES public.use_cases(id) ON DELETE CASCADE,
  ADD CONSTRAINT use_case_business_objectives_objective_id_fkey
    FOREIGN KEY (objective_id) REFERENCES public.business_objectives(id) ON DELETE CASCADE;
NOTIFY pgrst, 'reload schema';