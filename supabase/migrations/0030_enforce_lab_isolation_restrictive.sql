-- =====================================================================
-- Migration: 0030_enforce_lab_isolation_restrictive.sql
-- Purpose:   Actually enforce laboratory data isolation at the database
--            level -- correctly this time. 0027 attempted this with
--            blanket PERMISSIVE policies and created a security
--            regression (see 0027/0028). This migration achieves the
--            same goal safely using RESTRICTIVE policies, which Postgres
--            combines with AND against the existing PERMISSIVE
--            role-based policies from 0002/0008/0009/0012/0013/0015/
--            0016/0021/0022 -- narrowing access, never bypassing it.
--
--            A row is now only accessible if BOTH are true:
--              (a) the original role-based policy allows it (unchanged
--                  from before this session), AND
--              (b) has_lab_access(laboratory_id) is true for the row
--
-- NOTE:      This has ALREADY been applied directly against production
--            via the Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0029_flatten_laboratories_schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- has_lab_access(): true if the current user is Admin (bypasses lab
-- restriction entirely, consistent with Admin's role everywhere else in
-- the app), OR the lab is their primary lab (personnel.laboratory_id),
-- OR the lab is one of their additional assigned labs
-- (personnel_laboratories).
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_lab_access(lab_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
AS $function$
  SELECT
    coalesce(current_access_role(), 'Viewer') = 'Admin'
    OR exists (
      SELECT 1 FROM personnel_laboratories pl
      JOIN personnel p ON p.id = pl.personnel_id
      WHERE p.auth_user_id = auth.uid() AND pl.laboratory_id = lab_id
    )
    OR exists (
      SELECT 1 FROM personnel p
      WHERE p.auth_user_id = auth.uid() AND p.laboratory_id = lab_id
    );
$function$;

-- ---------------------------------------------------------------------
-- RESTRICTIVE lab-access policy on all 23 lab-data tables.
-- ---------------------------------------------------------------------

CREATE POLICY "Lab restriction" ON clause_status AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON tasks AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON nonconformities AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON risks AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON clause_evidence AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON task_templates AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

-- audit_log: SELECT-only restriction, since no INSERT/UPDATE/DELETE
-- policy exists on this table at all -- correctly, nothing but the
-- log_audit() trigger can write to it.
CREATE POLICY "Lab restriction" ON audit_log AS RESTRICTIVE FOR SELECT
  USING (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON competency_records AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON document_acknowledgments AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON documents AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON eqa_events AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON equipment AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON equipment_downtime AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON equipment_records AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON machine_api_keys AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON management_reviews AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON notification_settings AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

-- personnel: additionally allow a user to always see their OWN row, even
-- if has_lab_access() would otherwise say no (safeguard against a user
-- ever being locked out of their own profile).
CREATE POLICY "Lab restriction" ON personnel AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id) OR auth_user_id = auth.uid())
  WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON qc_controls AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON qc_machines AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON qc_parameters AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON qc_runs AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

CREATE POLICY "Lab restriction" ON task_comments AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

-- =====================================================================
-- End of migration 0030_enforce_lab_isolation_restrictive.sql
--
-- Post-migration state:
--   - Laboratory data isolation is now genuinely enforced at the
--     database level across all 23 tables.
--   - All original role-based restrictions (can_edit(), can_assign_tasks(),
--     Admin-only machine_api_keys, immutable audit_log, qc_runs'
--     authorized=false lock, task_comments' own-or-admin delete rule,
--     document_acknowledgments' self-only insert, etc.) remain fully
--     intact and are now ADDITIONALLY narrowed by lab access, not
--     replaced or bypassed.
--   - Admins bypass lab restriction entirely (see everything, matching
--     their existing system-wide role elsewhere in the app).
--
-- NOT yet done:
--   - Frontend has no lab-switcher UI yet, and no existing write call in
--     the app currently supplies laboratory_id. Until the frontend is
--     updated, writes from the app itself may start failing RLS checks.
--   - Reassign real personnel out of Biochemistry into their actual labs
--   - End-to-end test: log in as a non-Admin user in one lab, confirm
--     they cannot see or write another lab's data
-- =====================================================================
