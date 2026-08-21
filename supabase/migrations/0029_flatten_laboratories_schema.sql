-- =====================================================================
-- Migration: 0029_flatten_laboratories_schema.sql
-- Purpose:   Removes the organizations -> laboratories hierarchy added
--            in 0025/0026, in favor of a flat laboratories-only design.
--
--            Decision: Medilixmaldives has no current plan to run this
--            software for more than one organization. The existing
--            frontend (src/api/laboratories.js) and the repo's own
--            0024_laboratories_foundation.sql were both already written
--            assuming a flat model with no organization_id at all --
--            keeping the organizations layer from 0025/0026 would have
--            meant carrying complexity the app doesn't use anywhere,
--            and diverging further from 0024's intended design.
--
-- NOTE:      This has ALREADY been applied directly against production
--            via the Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0028_remediate_lab_policy_regression.sql
-- =====================================================================

ALTER TABLE laboratories DROP CONSTRAINT IF EXISTS laboratories_organization_id_fkey;
ALTER TABLE laboratories DROP COLUMN IF EXISTS organization_id;
ALTER TABLE laboratories ADD CONSTRAINT laboratories_name_key UNIQUE (name);
DROP TABLE IF EXISTS organizations;

-- =====================================================================
-- End of migration 0029_flatten_laboratories_schema.sql
--
-- Post-migration state:
--   - laboratories: id, name (now UNIQUE), created_at -- no organization
--     layer. Matches 0024's original intended design and the existing
--     frontend's assumptions exactly.
--   - The 5 real laboratories (Biochemistry, Hematology, Clinical
--     Pathology, Infectious Serology, Microbiology) are unaffected --
--     only the now-removed organization_id column and the single
--     "Default Organization" row are gone.
--
-- IN PROGRESS (not yet confirmed applied -- see 0030):
--   - has_lab_access(lab_id) helper function, adapted from 0024, checking
--     both personnel.laboratory_id (primary lab) and personnel_laboratories
--     (additional labs)
--   - RESTRICTIVE RLS policies on all 23 lab-data tables, which Postgres
--     ANDs with the existing role-based PERMISSIVE policies rather than
--     OR-ing (the mistake made in 0027) -- so lab access becomes a real
--     additional requirement on top of the existing role checks, without
--     touching or risking any of those original policies.
-- =====================================================================
