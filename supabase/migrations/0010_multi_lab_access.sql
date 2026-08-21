-- =====================================================================
-- Migration: 0010_multi_lab_access.sql
-- Purpose:   Create the five specialty laboratories, support users who
--            need access to more than one lab (e.g. QC Manager) without
--            re-login, and lock down laboratory creation/assignment to
--            Admins only via RLS.
--
-- NOTE:      This migration has ALREADY been applied directly against
--            production via the Supabase SQL editor on 2026-08-21.
--            This file exists purely as a version-controlled record so
--            it can be re-run on fresh/staging environments. Statements
--            are written to be safely re-runnable where practical, but
--            review before re-running against an environment that may
--            already have this applied.
--
-- Depends on: 0009_laboratory_separation.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Rename the original default lab to Biochemistry.
--    All pre-existing clause_status/tasks/etc. data (34 clause_status
--    rows and everything backfilled in migration 0009) now correctly
--    lives under a real specialty lab name instead of a placeholder.
-- ---------------------------------------------------------------------

UPDATE laboratories
SET name = 'Biochemistry'
WHERE name = 'Default Laboratory';

-- ---------------------------------------------------------------------
-- 2. Create the four remaining specialty laboratories, under the same
--    organization as Biochemistry.
-- ---------------------------------------------------------------------

INSERT INTO laboratories (name, organization_id)
SELECT lab_name, (SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1)
FROM (VALUES
  ('Hematology'),
  ('Clinical Pathology'),
  ('Infectious Serology'),
  ('Microbiology')
) AS new_labs(lab_name)
WHERE NOT EXISTS (
  SELECT 1 FROM laboratories WHERE laboratories.name = new_labs.lab_name
);

-- ---------------------------------------------------------------------
-- 3. Multi-lab access model.
--
--    personnel.laboratory_id remains each user's PRIMARY / DEFAULT lab
--    (set in migration 0009). This new junction table adds ADDITIONAL
--    labs a user can switch into without logging out -- e.g. a QC
--    Manager who oversees more than one department.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS personnel_laboratories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
  laboratory_id UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (personnel_id, laboratory_id)
);

-- ---------------------------------------------------------------------
-- 4. Helper functions
-- ---------------------------------------------------------------------

-- is_admin(): true if the currently authenticated user's personnel
-- record has access_role = 'Admin'. Used throughout RLS policies.
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM personnel
    WHERE auth_user_id = auth.uid()
    AND access_role = 'Admin'
  );
$function$;

-- get_my_accessible_labs(): returns every lab the current user can
-- access -- their primary lab (is_default = true) plus any additional
-- labs assigned via personnel_laboratories. Intended to be called by
-- the frontend right after login to populate the lab-switcher dropdown.
CREATE OR REPLACE FUNCTION public.get_my_accessible_labs()
  RETURNS TABLE (
    laboratory_id uuid,
    laboratory_name text,
    is_default boolean
  )
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $function$
  SELECT l.id, l.name, (l.id = p.laboratory_id) AS is_default
  FROM personnel p
  JOIN laboratories l ON l.id = p.laboratory_id
  WHERE p.auth_user_id = auth.uid()

  UNION

  SELECT l.id, l.name, false AS is_default
  FROM personnel_laboratories pl
  JOIN personnel p ON p.id = pl.personnel_id
  JOIN laboratories l ON l.id = pl.laboratory_id
  WHERE p.auth_user_id = auth.uid()

  ORDER BY 3 DESC, 2;
$function$;

-- ---------------------------------------------------------------------
-- 5. Row Level Security: laboratories and personnel_laboratories
--
--    Rule: anyone authenticated can VIEW labs (needed for the login
--    dropdown) and view their own lab assignments. Only Admins can
--    create labs or assign/remove a person's lab access.
-- ---------------------------------------------------------------------

ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_laboratories ENABLE ROW LEVEL SECURITY;

-- laboratories policies
CREATE POLICY "Anyone can view labs" ON laboratories
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can create labs" ON laboratories
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update labs" ON laboratories
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete labs" ON laboratories
  FOR DELETE
  USING (is_admin());

-- personnel_laboratories policies
CREATE POLICY "Users can view their own lab assignments" ON personnel_laboratories
  FOR SELECT
  USING (
    personnel_id IN (SELECT id FROM personnel WHERE auth_user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Only admins can assign users to labs" ON personnel_laboratories
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update lab assignments" ON personnel_laboratories
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can remove lab assignments" ON personnel_laboratories
  FOR DELETE
  USING (is_admin());

-- =====================================================================
-- End of migration 0010_multi_lab_access.sql
--
-- Post-migration state:
--   - 5 laboratories exist: Biochemistry (has existing production data),
--     Hematology, Clinical Pathology, Infectious Serology, Microbiology
--   - personnel.laboratory_id = each user's primary/default lab
--   - personnel_laboratories = additional labs a user can switch into
--     (e.g. QC Manager covering multiple departments)
--   - is_admin() and get_my_accessible_labs() available for app use
--   - RLS enforced on laboratories and personnel_laboratories:
--       * any authenticated user can read (for dropdowns)
--       * only Admin-role users can create labs or assign lab access
--
-- NOT yet done (tracked separately):
--   - RLS on the other 21 data tables (clause_status, tasks,
--     nonconformities, risks, clause_evidence, task_templates,
--     audit_log, competency_records, document_acknowledgments,
--     documents, eqa_events, equipment, equipment_downtime,
--     equipment_records, machine_api_keys, management_reviews,
--     notification_settings, personnel, qc_controls, qc_machines,
--     qc_parameters, qc_runs, task_comments) -- currently any
--     authenticated user can query any lab's data on these tables
--   - Reassigning existing personnel out of Biochemistry into their
--     real labs (planned to be done via the app's admin UI later)
--   - Frontend: lab-switcher dropdown, session "active lab" state,
--     default-lab selection UI, admin UI for creating labs and
--     assigning personnel to labs
-- =====================================================================
