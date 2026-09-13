-- =====================================================================
-- Migration: 0043_qc_material_name.sql
-- Purpose:   Adds a "QC material" name to qc_controls — the commercial
--            control product (e.g. "Bio-Rad Liquichek"), distinct from
--            its lot number. Needed to filter/select "which QC material"
--            when logging a batch of results across every analyte
--            tested under that material, at the redesigned IQC page's
--            new-entry screen.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0042_analyser_protocol_mapping.sql
-- =====================================================================

ALTER TABLE qc_controls ADD COLUMN IF NOT EXISTS material_name TEXT;

-- =====================================================================
-- End of migration 0043_qc_material_name.sql
-- =====================================================================
