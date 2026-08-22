-- =====================================================================
-- Migration: 0032_eqa_dynamic_discipline_and_samples.sql
-- Purpose:   1) Let EQA discipline be any of the real laboratories that
--               now exist (Biochemistry, Hematology, Clinical Pathology,
--               Infectious Serology, Microbiology, and any future lab
--               created via Settings) instead of the original fixed
--               3-value list ('Hematology','Biochemistry',
--               'Immunochemistry') left over from before labs existed.
--            2) Add a sample_number column so a single EQA cycle's
--               results (typically 12 samples per round) can be tracked
--               individually instead of one result per analyte per cycle.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0031_self_service_email_update.sql
-- =====================================================================

-- Drop the old fixed-list constraint. Free text is the pragmatic choice
-- here — the frontend already drives valid discipline choices dynamically
-- from the laboratories table, and a fixed CHECK list would go stale
-- every time a new lab is created via Settings.
ALTER TABLE eqa_events DROP CONSTRAINT IF EXISTS eqa_events_discipline_check;

-- Add sample tracking. Nullable — existing rows and any future
-- "not sample-specific" result stay valid. Light sanity check only
-- (must be positive if provided), since providers occasionally use more
-- or fewer than 12 samples per cycle.
ALTER TABLE eqa_events ADD COLUMN IF NOT EXISTS sample_number integer;
ALTER TABLE eqa_events ADD CONSTRAINT eqa_events_sample_number_check
  CHECK (sample_number IS NULL OR sample_number > 0);

-- =====================================================================
-- End of migration 0032_eqa_dynamic_discipline_and_samples.sql
-- =====================================================================
