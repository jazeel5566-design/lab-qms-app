-- =====================================================================
-- Migration: 0025_laboratory_separation.sql
-- Purpose:   Introduce organization -> laboratory hierarchy and scope
--            all lab-data tables by laboratory_id. Fixes the original
--            clause_status_clause_id_key CASCADE error by rebuilding
--            the unique constraint as a composite (clause_id, laboratory_id)
--            key and re-pointing dependent foreign keys at it.
--
-- NOTE:      This migration has ALREADY been applied directly against
--            production via the Supabase SQL editor on 2026-08-21.
--            This file exists purely as a version-controlled record so
--            it can be re-run on fresh/staging environments. Statements
--            are written to be safely re-runnable where practical
--            (IF NOT EXISTS / ON CONFLICT), but review before re-running
--            against an environment that may already have this applied.
--
-- Depends on: 0008_phase1_upgrades_safe_rerun.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Organizations and Laboratories hierarchy
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed a default organization or reuse the existing one.
INSERT INTO organizations (name)
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Default Organization');

-- Link laboratories -> organizations
ALTER TABLE laboratories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

UPDATE laboratories
SET organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE laboratories ALTER COLUMN organization_id SET NOT NULL;

-- Seed a default laboratory if none exists (should already exist from initial setup).
INSERT INTO laboratories (name, organization_id)
SELECT 'Default Laboratory', (SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM laboratories WHERE name = 'Default Laboratory');

-- ---------------------------------------------------------------------
-- 2. Add laboratory_id to clause_status and rebuild its unique key
-- ---------------------------------------------------------------------

ALTER TABLE clause_status ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);

UPDATE clause_status
SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1)
WHERE laboratory_id IS NULL;

ALTER TABLE clause_status ALTER COLUMN laboratory_id SET NOT NULL;

-- Drop the five dependent FKs before touching the old unique constraint.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_clause_id_fkey;
ALTER TABLE nonconformities DROP CONSTRAINT IF EXISTS nonconformities_clause_id_fkey;
ALTER TABLE risks DROP CONSTRAINT IF EXISTS risks_clause_id_fkey;
ALTER TABLE clause_evidence DROP CONSTRAINT IF EXISTS clause_evidence_clause_id_fkey;
ALTER TABLE task_templates DROP CONSTRAINT IF EXISTS task_templates_default_clause_id_fkey;

-- Drop the old single-column unique constraint (now unblocked).
ALTER TABLE clause_status DROP CONSTRAINT IF EXISTS clause_status_clause_id_key;

-- Composite unique constraint: a clause is now unique per laboratory.
ALTER TABLE clause_status ADD CONSTRAINT clause_status_clause_lab_key UNIQUE (clause_id, laboratory_id);

-- ---------------------------------------------------------------------
-- 3. Add laboratory_id to every remaining lab-data table
--    (add column -> backfill to Default Laboratory -> set NOT NULL)
-- ---------------------------------------------------------------------

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE tasks SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE tasks ALTER COLUMN laboratory_id SET NOT NULL;

-- nonconformities
ALTER TABLE nonconformities ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE nonconformities SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE nonconformities ALTER COLUMN laboratory_id SET NOT NULL;

-- risks
ALTER TABLE risks ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE risks SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE risks ALTER COLUMN laboratory_id SET NOT NULL;

-- clause_evidence
ALTER TABLE clause_evidence ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE clause_evidence SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE clause_evidence ALTER COLUMN laboratory_id SET NOT NULL;

-- task_templates
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE task_templates SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE task_templates ALTER COLUMN laboratory_id SET NOT NULL;

-- audit_log (column added before the log_audit() trigger patch below;
-- existing rows backfilled directly since the trigger only affects new rows)
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE audit_log SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE audit_log ALTER COLUMN laboratory_id SET NOT NULL;

-- competency_records
ALTER TABLE competency_records ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE competency_records SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE competency_records ALTER COLUMN laboratory_id SET NOT NULL;

-- document_acknowledgments
ALTER TABLE document_acknowledgments ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE document_acknowledgments SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE document_acknowledgments ALTER COLUMN laboratory_id SET NOT NULL;

-- documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE documents SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE documents ALTER COLUMN laboratory_id SET NOT NULL;

-- eqa_events
ALTER TABLE eqa_events ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE eqa_events SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE eqa_events ALTER COLUMN laboratory_id SET NOT NULL;

-- equipment
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE equipment SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE equipment ALTER COLUMN laboratory_id SET NOT NULL;

-- equipment_downtime
ALTER TABLE equipment_downtime ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE equipment_downtime SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE equipment_downtime ALTER COLUMN laboratory_id SET NOT NULL;

-- equipment_records
ALTER TABLE equipment_records ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE equipment_records SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE equipment_records ALTER COLUMN laboratory_id SET NOT NULL;

-- machine_api_keys
ALTER TABLE machine_api_keys ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE machine_api_keys SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE machine_api_keys ALTER COLUMN laboratory_id SET NOT NULL;

-- management_reviews
ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE management_reviews SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE management_reviews ALTER COLUMN laboratory_id SET NOT NULL;

-- notification_settings
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE notification_settings SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE notification_settings ALTER COLUMN laboratory_id SET NOT NULL;

-- personnel
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE personnel SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE personnel ALTER COLUMN laboratory_id SET NOT NULL;

-- qc_controls
ALTER TABLE qc_controls ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE qc_controls SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE qc_controls ALTER COLUMN laboratory_id SET NOT NULL;

-- qc_machines
ALTER TABLE qc_machines ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE qc_machines SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE qc_machines ALTER COLUMN laboratory_id SET NOT NULL;

-- qc_parameters
ALTER TABLE qc_parameters ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE qc_parameters SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE qc_parameters ALTER COLUMN laboratory_id SET NOT NULL;

-- qc_runs
ALTER TABLE qc_runs ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE qc_runs SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE qc_runs ALTER COLUMN laboratory_id SET NOT NULL;

-- task_comments
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS laboratory_id UUID REFERENCES laboratories(id);
UPDATE task_comments SET laboratory_id = (SELECT id FROM laboratories WHERE name = 'Default Laboratory' LIMIT 1) WHERE laboratory_id IS NULL;
ALTER TABLE task_comments ALTER COLUMN laboratory_id SET NOT NULL;

-- ---------------------------------------------------------------------
-- 4. Patch log_audit() trigger function to populate laboratory_id
--    dynamically from whichever row (NEW/OLD) fired the trigger.
--    Required because audit_log.laboratory_id is now NOT NULL and the
--    trigger fires generically across many tables.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_audit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
declare
  v_actor_id uuid;
  v_actor_name text;
  v_actor_role text;
  v_record_id uuid;
  v_laboratory_id uuid;
begin
  select id, name, access_role into v_actor_id, v_actor_name, v_actor_role
  from personnel where auth_user_id = auth.uid();

  v_record_id := coalesce(new.id, old.id);
  v_laboratory_id := coalesce(
    (to_jsonb(new)->>'laboratory_id')::uuid,
    (to_jsonb(old)->>'laboratory_id')::uuid
  );

  insert into audit_log (actor_id, actor_name, actor_role, entity, action, record_id, summary, laboratory_id)
  values (
    v_actor_id,
    coalesce(v_actor_name, 'Unknown'),
    coalesce(v_actor_role, ''),
    TG_TABLE_NAME,
    TG_OP,
    v_record_id,
    TG_OP || ' on ' || TG_TABLE_NAME,
    v_laboratory_id
  );

  return coalesce(new, old);
end;
$function$;

-- ---------------------------------------------------------------------
-- 5. Recreate the five foreign keys as composite (clause_id, laboratory_id)
--    keys, matching clause_status's new composite unique constraint.
--    This is what actually scopes clause tracking per-laboratory.
-- ---------------------------------------------------------------------

ALTER TABLE tasks ADD CONSTRAINT tasks_clause_id_fkey
  FOREIGN KEY (clause_id, laboratory_id) REFERENCES clause_status (clause_id, laboratory_id);

ALTER TABLE nonconformities ADD CONSTRAINT nonconformities_clause_id_fkey
  FOREIGN KEY (clause_id, laboratory_id) REFERENCES clause_status (clause_id, laboratory_id);

ALTER TABLE risks ADD CONSTRAINT risks_clause_id_fkey
  FOREIGN KEY (clause_id, laboratory_id) REFERENCES clause_status (clause_id, laboratory_id);

ALTER TABLE clause_evidence ADD CONSTRAINT clause_evidence_clause_id_fkey
  FOREIGN KEY (clause_id, laboratory_id) REFERENCES clause_status (clause_id, laboratory_id);

ALTER TABLE task_templates ADD CONSTRAINT task_templates_default_clause_id_fkey
  FOREIGN KEY (default_clause_id, laboratory_id) REFERENCES clause_status (clause_id, laboratory_id);

-- =====================================================================
-- End of migration 0025_laboratory_separation.sql
--
-- Post-migration state:
--   - organizations (1) -> laboratories (many) hierarchy established
--   - All 21 lab-data tables carry a required laboratory_id:
--     clause_status, tasks, nonconformities, risks, clause_evidence,
--     task_templates, audit_log, competency_records,
--     document_acknowledgments, documents, eqa_events, equipment,
--     equipment_downtime, equipment_records, machine_api_keys,
--     management_reviews, notification_settings, personnel,
--     qc_controls, qc_machines, qc_parameters, qc_runs, task_comments
--   - clause_status uniqueness is now scoped per (clause_id, laboratory_id)
--   - log_audit() trigger populates laboratory_id automatically
--
-- NOT yet done (tracked separately, see follow-up migrations / app changes):
--   - Row Level Security (RLS) policies for laboratory isolation
--   - Application code changes to pass/filter by laboratory_id
--   - Auth/session laboratory context (personnel.laboratory_id usage)
-- =====================================================================
