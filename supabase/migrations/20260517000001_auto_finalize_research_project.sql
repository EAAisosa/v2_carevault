-- Automatically transition research_projects.status from pending_facilities
-- to approved/rejected when all facility decisions are recorded.
--
-- This replaces the broken frontend code that tried to UPDATE research_projects
-- as a facility admin, which was silently blocked by RLS (facility admins only
-- have a SELECT policy on research_projects, not UPDATE).

CREATE OR REPLACE FUNCTION public.auto_finalize_research_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pending_count int;
  v_approved_count int;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved')
  INTO v_pending_count, v_approved_count
  FROM public.research_project_facilities
  WHERE project_id = NEW.project_id;

  -- Only finalize once all decisions are in
  IF v_pending_count = 0 THEN
    UPDATE public.research_projects
    SET status = CASE WHEN v_approved_count > 0 THEN 'approved' ELSE 'rejected' END
    WHERE id = NEW.project_id
      AND status = 'pending_facilities';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_finalize_research_project
AFTER UPDATE OF status ON public.research_project_facilities
FOR EACH ROW
WHEN (OLD.status = 'pending' AND NEW.status IS DISTINCT FROM 'pending')
EXECUTE FUNCTION public.auto_finalize_research_project();
