-- =====================================================================
-- Migration: 0034_eqa_program_catalog.sql
-- Purpose:   Introduce a structured EQA "program catalog" per lab, so the
--            EQA entry form's Provider/Program/Cycle/Analyte fields can
--            become dropdowns backed by real data (matching the "info"
--            tab of the EQAS_details.xlsx spreadsheet: "Provider - can
--            be kept as one time entry", "Analytes - dropdown/list")
--            instead of free text.
--
--            eqa_programs: one row per (provider, program name, cycle)
--            that a lab is enrolled in — e.g. "Biorad / Clinical
--            Chemistry program / Cycle 24".
--
--            eqa_program_analytes: the list of analytes tested under
--            each program (e.g. Clinical Chemistry program tests
--            Glucose, Albumin, ALKP, ...).
--
--            eqa_events gains an optional program_id link, so a logged
--            result can be tied back to its catalog program — but stays
--            nullable, since ad-hoc/one-off EQA results that don't match
--            any catalogued program should still be loggable directly.
--
-- NOTE:      Run this in the Supabase SQL editor to apply it.
--
-- Depends on: 0033_eqa_run_due_dates.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS eqa_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID NOT NULL REFERENCES laboratories(id),
  provider TEXT NOT NULL,
  program_name TEXT NOT NULL,
  cycle TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (laboratory_id, provider, program_name, cycle)
);

CREATE TABLE IF NOT EXISTS eqa_program_analytes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES eqa_programs(id) ON DELETE CASCADE,
  analyte TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, analyte)
);

ALTER TABLE eqa_events ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES eqa_programs(id);

-- ---------------------------------------------------------------------
-- RLS: readable by anyone (needed to populate dropdowns for any lab
-- member), editable only by can_edit() AND lab-restricted, matching the
-- pattern used everywhere else in the app (0002's role checks combined
-- with 0030's RESTRICTIVE lab-access policies).
-- ---------------------------------------------------------------------

ALTER TABLE eqa_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eqa_programs_select" ON eqa_programs FOR SELECT
  USING (true);
CREATE POLICY "eqa_programs_insert" ON eqa_programs FOR INSERT
  WITH CHECK (can_edit());
CREATE POLICY "eqa_programs_update" ON eqa_programs FOR UPDATE
  USING (can_edit());
CREATE POLICY "eqa_programs_delete" ON eqa_programs FOR DELETE
  USING (can_edit());

CREATE POLICY "Lab restriction" ON eqa_programs AS RESTRICTIVE FOR ALL
  USING (has_lab_access(laboratory_id)) WITH CHECK (has_lab_access(laboratory_id));

-- eqa_program_analytes has no laboratory_id of its own — it inherits lab
-- scoping through its parent program, checked via a subquery.
ALTER TABLE eqa_program_analytes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eqa_program_analytes_select" ON eqa_program_analytes FOR SELECT
  USING (true);
CREATE POLICY "eqa_program_analytes_insert" ON eqa_program_analytes FOR INSERT
  WITH CHECK (can_edit() AND EXISTS (SELECT 1 FROM eqa_programs p WHERE p.id = program_id AND has_lab_access(p.laboratory_id)));
CREATE POLICY "eqa_program_analytes_update" ON eqa_program_analytes FOR UPDATE
  USING (can_edit() AND EXISTS (SELECT 1 FROM eqa_programs p WHERE p.id = program_id AND has_lab_access(p.laboratory_id)));
CREATE POLICY "eqa_program_analytes_delete" ON eqa_program_analytes FOR DELETE
  USING (can_edit() AND EXISTS (SELECT 1 FROM eqa_programs p WHERE p.id = program_id AND has_lab_access(p.laboratory_id)));

-- =====================================================================
-- End of migration 0034_eqa_program_catalog.sql
-- =====================================================================
