-- =====================================================================
-- Migration: 0045_qc_manufacturer_value_fields.sql
-- Purpose:   QC material manufacturers (Bio-Rad, Randox, Roche, etc.)
--            publish more than just a mean and SD on their value
--            assignment sheets / certificates of analysis:
--              - An explicit expected RANGE (not just derived from
--                mean ± 2SD — the printed range is the manufacturer's
--                own figure, sometimes rounded/adjusted)
--              - CV% (Coefficient of Variation) — frequently given
--                alongside or instead of SD
--              - Peer group N — how many data points/labs the assigned
--                value is statistically based on
--              - A reagent lot tied to the value assignment (assigned
--                values for the same control lot can shift when the
--                reagent lot changes, especially for immunoassays)
--
--            The per-machine/per-analyte structure already in place
--            (one control row per parameter) already captures the
--            "instrument/method-specific" nature of these values —
--            manufacturers publish different targets per method, and
--            this app already requires entering values separately per
--            machine, which lines up with that.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0044_qc_run_unit.sql
-- =====================================================================

ALTER TABLE qc_controls ADD COLUMN IF NOT EXISTS cv_percent NUMERIC;
ALTER TABLE qc_controls ADD COLUMN IF NOT EXISTS range_low NUMERIC;
ALTER TABLE qc_controls ADD COLUMN IF NOT EXISTS range_high NUMERIC;
ALTER TABLE qc_controls ADD COLUMN IF NOT EXISTS peer_group_n INTEGER;
ALTER TABLE qc_controls ADD COLUMN IF NOT EXISTS reagent_lot TEXT;

-- =====================================================================
-- End of migration 0045_qc_manufacturer_value_fields.sql
-- =====================================================================
