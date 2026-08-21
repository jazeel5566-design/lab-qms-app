-- =====================================================================
-- Migration: 0011_rls_lab_isolation.sql
-- Purpose:   Enforce laboratory data isolation at the database level.
--            Until this migration, laboratory_id existed on every table
--            (from migration 0009) but nothing prevented an authenticated
--            user from querying rows belonging to a lab they don't
--            belong to -- isolation depended entirely on the app
--            remembering to filter correctly. This migration closes
--            that gap with Row Level Security.
--
-- NOTE:      This migration has ALREADY been applied directly against
--            production via the Supabase SQL editor on 2026-08-21.
--            This file exists purely as a version-controlled record so
--            it can be re-run on fresh/staging environments.
--
-- Depends on: 0010_multi_lab_access.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper: every laboratory_id the current user can access
--    (their primary lab via personnel.laboratory_id, plus any extra
--    labs assigned via personnel_laboratories). Used by every policy
--    below instead of repeating the join logic 23 times.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_lab_ids()
  RETURNS uuid[]
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $function$
  SELECT ARRAY(
    SELECT p.laboratory_id
    FROM personnel p
    WHERE p.auth_user_id = auth.uid()

    UNION

    SELECT pl.laboratory_id
    FROM personnel_laboratories pl
    JOIN personnel p ON p.id = pl.personnel_id
    WHERE p.auth_user_id = auth.uid()
  );
$function$;

-- ---------------------------------------------------------------------
-- 2. Enable RLS + add lab-scoped policy on every remaining data table.
--    Pattern: a row is visible/writable if its laboratory_id is in the
--    current user's accessible labs, OR the user is an Admin
--    (is_admin(), from migration 0010).
--
--    Two tables deviate from the standard pattern -- see inline notes.
-- ---------------------------------------------------------------------

-- clause_status
ALTER TABLE clause_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON clause_status FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON tasks FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- nonconformities
ALTER TABLE nonconformities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON nonconformities FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- risks
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON risks FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- clause_evidence
ALTER TABLE clause_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON clause_evidence FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- task_templates
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON task_templates FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- audit_log
-- DEVIATION: read is lab-scoped, but INSERT is open (WITH CHECK true)
-- because log_audit() runs as SECURITY DEFINER on behalf of the system,
-- not the acting user directly. No UPDATE/DELETE policy exists at all --
-- nobody, including Admins, can edit or delete audit history via the API.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped read" ON audit_log FOR SELECT
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());
CREATE POLICY "System can insert audit rows" ON audit_log FOR INSERT
  WITH CHECK (true);

-- competency_records
ALTER TABLE competency_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON competency_records FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- document_acknowledgments
ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON document_acknowledgments FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON documents FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- eqa_events
ALTER TABLE eqa_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON eqa_events FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- equipment
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON equipment FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- equipment_downtime
ALTER TABLE equipment_downtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON equipment_downtime FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- equipment_records
ALTER TABLE equipment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON equipment_records FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- machine_api_keys
ALTER TABLE machine_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON machine_api_keys FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- management_reviews
ALTER TABLE management_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON management_reviews FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- notification_settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON notification_settings FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- personnel
-- DEVIATION: read policy also allows a user to always see their OWN row
-- (auth_user_id = auth.uid()) in addition to the standard lab-scoped rule,
-- as a safeguard so a user's own profile is never inaccessible to them.
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON personnel FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR auth_user_id = auth.uid() OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- qc_controls
ALTER TABLE qc_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON qc_controls FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- qc_machines
ALTER TABLE qc_machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON qc_machines FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- qc_parameters
ALTER TABLE qc_parameters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON qc_parameters FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- qc_runs
ALTER TABLE qc_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON qc_runs FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab-scoped access" ON task_comments FOR ALL
  USING (laboratory_id = ANY(get_my_lab_ids()) OR is_admin())
  WITH CHECK (laboratory_id = ANY(get_my_lab_ids()) OR is_admin());

-- =====================================================================
-- End of migration 0011_rls_lab_isolation.sql
--
-- Post-migration state:
--   - All 23 lab-data tables now have RLS enabled and enforced:
--     clause_status, tasks, nonconformities, risks, clause_evidence,
--     task_templates, audit_log, competency_records,
--     document_acknowledgments, documents, eqa_events, equipment,
--     equipment_downtime, equipment_records, machine_api_keys,
--     management_reviews, notification_settings, personnel,
--     qc_controls, qc_machines, qc_parameters, qc_runs, task_comments
--   - A non-admin user can only see/write rows in labs they belong to
--     (their primary lab, or any lab in personnel_laboratories)
--   - Admins bypass lab-scoping entirely (full visibility across labs)
--   - audit_log is effectively append-only: inserts allowed for the
--     system trigger, but no UPDATE/DELETE policy exists for anyone
--
-- Combined with migrations 0009 and 0010, laboratory data isolation is
-- now enforced end-to-end at the database level, independent of
-- whether the application code remembers to filter correctly.
--
-- NOT yet done (tracked separately):
--   - Frontend: lab-switcher dropdown, session "active lab" state,
--     admin UI for creating labs / assigning personnel to labs
--   - Every INSERT/UPDATE call in the app must now supply laboratory_id
--     matching one of the user's accessible labs, or RLS will silently
--     reject the write (WITH CHECK failure) -- this MUST be wired up
--     in application code before going live, or writes will start
--     failing across the app
--   - Reassigning existing personnel out of Biochemistry into their
--     real labs (via the app's admin UI once built)
--   - End-to-end testing: create a second test user in a different lab
--     and confirm they cannot see/write Biochemistry's data
-- =====================================================================
