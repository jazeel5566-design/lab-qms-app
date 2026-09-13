-- =====================================================================
-- Migration: 0044_qc_run_unit.sql
-- Purpose:   Adds a per-result unit to qc_runs. The new entry form lets
--            a unit be chosen (or typed) for each result — without a
--            column to store it, that choice would be silently
--            discarded on save. Falls back to the parameter's own unit
--            for display when not set on an older row.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0043_qc_material_name.sql
-- =====================================================================

ALTER TABLE qc_runs ADD COLUMN IF NOT EXISTS unit TEXT;

-- =====================================================================
-- End of migration 0044_qc_run_unit.sql
-- =====================================================================
