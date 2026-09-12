-- =====================================================================
-- Migration: 0039_nc_assignee_can_update.sql
-- Purpose:   Extends the NC UPDATE policy so the person an NC is
--            ASSIGNED to can fill in root cause / corrective action /
--            preventive action / evidence and submit their own NC for
--            verification — not just the raiser or a manager.
--
--            Previously (0037): UPDATE allowed for can_assign_tasks()
--            OR raised_by = current_personnel_id(). This adds
--            OR assigned_to = current_personnel_id().
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0038_nc_number_per_lab_unique.sql
-- =====================================================================

DROP POLICY IF EXISTS ncs_update ON nonconformities;
CREATE POLICY ncs_update ON nonconformities FOR UPDATE
  USING (can_assign_tasks() OR raised_by = current_personnel_id() OR assigned_to = current_personnel_id())
  WITH CHECK (can_assign_tasks() OR raised_by = current_personnel_id() OR assigned_to = current_personnel_id());

-- =====================================================================
-- End of migration 0039_nc_assignee_can_update.sql
-- =====================================================================
