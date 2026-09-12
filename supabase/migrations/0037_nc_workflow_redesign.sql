-- =====================================================================
-- Migration: 0037_nc_workflow_redesign.sql
-- Purpose:   Redesigns the NC/CAPA workflow:
--            1. Anyone (non-Viewer) can log a bare-bones NC — title,
--               description, date occurred. Report date and "raised by"
--               are always system-generated, never manually chosen.
--            2. Only lab/QA managers and their deputies (the same role
--               group that can assign tasks) can fill in the rest
--               (clause, severity, root cause, assignment, close date)
--               and can see every NC in the lab.
--            3. A regular staff member can only see NCs they personally
--               raised or are assigned to — not the whole register.
--
-- date_occurred: when the nonconformity actually happened (can be in the
--   past). Distinct from the existing date_raised, which is when it was
--   logged into the system (always "today", already auto-set).
--
-- generate_nc_number(): previously the NC number was computed client-side
-- from how many NCs the browser could see (ncs.length + 1). Once regular
-- staff can only see their OWN NCs, that count is no longer the true
-- total, and would start colliding/duplicating NC numbers. This function
-- is SECURITY DEFINER so it always counts every NC in the lab regardless
-- of who's asking, and returns the correct next number.
--
-- NOTE:      Run this in the Supabase SQL editor to apply it.
--
-- Depends on: 0036_nc_linked_task.sql
-- =====================================================================

ALTER TABLE nonconformities ADD COLUMN IF NOT EXISTS date_occurred DATE;

CREATE OR REPLACE FUNCTION public.generate_nc_number(p_laboratory_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX((regexp_match(nc_number, '^NC-(\d+)$'))[1]::integer), 0) + 1
  INTO next_num
  FROM nonconformities
  WHERE laboratory_id = p_laboratory_id;
  RETURN 'NC-' || lpad(next_num::text, 3, '0');
END;
$function$;

-- Replace the visibility/edit policies. INSERT stays open to can_edit()
-- (any non-Viewer) — that part of the workflow doesn't change.
DROP POLICY IF EXISTS ncs_select ON nonconformities;
CREATE POLICY ncs_select ON nonconformities FOR SELECT
  USING (
    can_assign_tasks()
    OR raised_by = current_personnel_id()
    OR assigned_to = current_personnel_id()
  );

DROP POLICY IF EXISTS ncs_update ON nonconformities;
CREATE POLICY ncs_update ON nonconformities FOR UPDATE
  USING (can_assign_tasks() OR raised_by = current_personnel_id())
  WITH CHECK (can_assign_tasks() OR raised_by = current_personnel_id());

DROP POLICY IF EXISTS ncs_delete ON nonconformities;
CREATE POLICY ncs_delete ON nonconformities FOR DELETE
  USING (can_assign_tasks());

-- =====================================================================
-- End of migration 0037_nc_workflow_redesign.sql
-- =====================================================================
