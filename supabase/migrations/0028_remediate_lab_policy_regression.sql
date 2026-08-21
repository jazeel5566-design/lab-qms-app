-- =====================================================================
-- Migration: 0028_remediate_lab_policy_regression.sql
-- Purpose:   Undo a security regression introduced by 0027. That
--            migration added a blanket "Lab-scoped access" permissive
--            RLS policy to 23 tables that ALREADY had carefully-designed
--            role-based policies from 0002 (and 0008, 0009, 0012, 0013,
--            0015, 0016, 0021, 0022). Because Postgres combines multiple
--            PERMISSIVE policies for the same command with OR (not AND),
--            0027's blanket policies created an alternate access path
--            that bypassed the original role checks entirely -- as long
--            as laboratory_id matched (which it did for every row, since
--            all existing data was still under one lab).
--
-- Concretely, before this fix:
--   - A Technologist could create/reassign/delete tasks (should require
--     Admin/Deputy Admin/QA Manager/Deputy QA Manager via can_assign_tasks())
--   - A Viewer could edit clause_status, NCs, equipment, QC runs, risks,
--     equipment_downtime, clause_evidence, etc. (should require can_edit())
--   - Any authenticated user could view/create/update machine_api_keys
--     (should be Admin-only -- this is API key management)
--   - Any authenticated user could edit management_reviews (should
--     require can_see_audit_backup(): Admin/QA Manager only)
--   - audit_log gained an OPEN client insert policy that never existed
--     before -- anyone could insert fabricated audit entries directly,
--     bypassing the SECURITY DEFINER trigger that's supposed to be the
--     only write path
--   - audit_log read access widened beyond can_see_audit_backup()
--   - document_acknowledgments: the "can only acknowledge as yourself"
--     check and the "Admin-only delete" check were both bypassable
--   - task_comments: the "delete your own comment, or Admin" check was
--     bypassable -- any lab member could delete anyone's comment
--   - qc_runs: the "authorized=false" immutability check (a result
--     becomes read-only once authorized) was bypassable
--
-- Fix: since 0027 only ADDED policies and never DROPPED the originals,
-- removing 0027's additions fully restores the exact pre-existing
-- security posture. No original policy needed to be touched or rewritten.
--
-- NOTE: This has ALREADY been applied directly against production via
-- the Supabase SQL editor on 2026-08-21, in the same session that
-- discovered the regression. This file is the version-controlled record.
--
-- Depends on: 0027_rls_lab_isolation_FLAWED_SEE_0028.sql
-- =====================================================================

DROP POLICY IF EXISTS "Lab-scoped access" ON clause_status;
DROP POLICY IF EXISTS "Lab-scoped access" ON tasks;
DROP POLICY IF EXISTS "Lab-scoped access" ON nonconformities;
DROP POLICY IF EXISTS "Lab-scoped access" ON risks;
DROP POLICY IF EXISTS "Lab-scoped access" ON clause_evidence;
DROP POLICY IF EXISTS "Lab-scoped access" ON task_templates;
DROP POLICY IF EXISTS "Lab-scoped read" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit rows" ON audit_log;
DROP POLICY IF EXISTS "Lab-scoped access" ON competency_records;
DROP POLICY IF EXISTS "Lab-scoped access" ON document_acknowledgments;
DROP POLICY IF EXISTS "Lab-scoped access" ON documents;
DROP POLICY IF EXISTS "Lab-scoped access" ON eqa_events;
DROP POLICY IF EXISTS "Lab-scoped access" ON equipment;
DROP POLICY IF EXISTS "Lab-scoped access" ON equipment_downtime;
DROP POLICY IF EXISTS "Lab-scoped access" ON equipment_records;
DROP POLICY IF EXISTS "Lab-scoped access" ON machine_api_keys;
DROP POLICY IF EXISTS "Lab-scoped access" ON management_reviews;
DROP POLICY IF EXISTS "Lab-scoped access" ON notification_settings;
DROP POLICY IF EXISTS "Lab-scoped access" ON personnel;
DROP POLICY IF EXISTS "Lab-scoped access" ON qc_controls;
DROP POLICY IF EXISTS "Lab-scoped access" ON qc_machines;
DROP POLICY IF EXISTS "Lab-scoped access" ON qc_parameters;
DROP POLICY IF EXISTS "Lab-scoped access" ON qc_runs;
DROP POLICY IF EXISTS "Lab-scoped access" ON task_comments;

-- =====================================================================
-- End of migration 0028_remediate_lab_policy_regression.sql
--
-- Post-migration state:
--   - All role-based policies from 0002/0008/0009/0012/0013/0015/0016/
--     0021/0022 are the ONLY active policies again on these 23 tables --
--     exactly as they were before this session started.
--   - laboratory_id still exists as a column on all 23 tables (from
--     0025/0026) -- that part of today's work was NOT a regression and
--     stays in place. It's just not yet ENFORCED by RLS.
--   - Net effect: laboratory_id is currently informational only. Lab
--     isolation is NOT yet enforced at the database level. This is a
--     known, deliberate gap until 0029 (see below) is written correctly.
--
-- NOT yet done (tracked separately, high priority):
--   - Proper lab-scoping needs to be re-added, this time using
--     RESTRICTIVE policies (which Postgres combines with AND, not OR)
--     so a lab check narrows the existing role-based policies instead
--     of creating a bypass. This is the same outcome 0024's approach
--     achieved by rewriting each policy directly with has_lab_access()
--     AND'd in -- RESTRICTIVE policies achieve the same result without
--     needing to touch/risk the original, already-correct policies.
--   - 0024_laboratories_foundation.sql itself can no longer run as
--     written -- it tries to CREATE TABLE laboratories, which now
--     already exists (created by 0025 with a different schema: an
--     organizations -> laboratories hierarchy, vs 0024's flat
--     laboratories-only design). This needs a decision: adapt 0024's
--     correct RLS pattern to the schema that's now actually live, or
--     reconcile the schemas first. Recommend treating 0024 as
--     superseded/reference-only rather than runnable as-is.
-- =====================================================================
