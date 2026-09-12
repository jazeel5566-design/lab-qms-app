-- =====================================================================
-- Migration: 0040_eqa_unit_field.sql
-- Purpose:   Adds a measurement unit field to eqa_events (e.g. mg/dL,
--            ng/mL, IU/L) for the redesigned EQAS results table.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0039_nc_assignee_can_update.sql
-- =====================================================================

ALTER TABLE eqa_events ADD COLUMN IF NOT EXISTS unit TEXT;

-- =====================================================================
-- End of migration 0040_eqa_unit_field.sql
-- =====================================================================
