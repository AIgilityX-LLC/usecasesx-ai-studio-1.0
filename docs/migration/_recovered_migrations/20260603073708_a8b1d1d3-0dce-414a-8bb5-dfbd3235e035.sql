
-- 1. Extend app_role with admin-tier roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ai_hub_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'usecasex_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reviewer';

-- 2. Extend use_case_status with the workflow values used by the admin UI
ALTER TYPE public.use_case_status ADD VALUE IF NOT EXISTS 'submitted_for_review';
ALTER TYPE public.use_case_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.use_case_status ADD VALUE IF NOT EXISTS 'unpublished';
