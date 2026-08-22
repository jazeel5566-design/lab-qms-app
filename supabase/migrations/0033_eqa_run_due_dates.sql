-- =====================================================================
-- Migration: 0033_eqa_run_due_dates.sql
-- Purpose:   Add sample run date and submission due date to eqa_events.
--
--            Real-world EQA workflow has (at least) three distinct
--            dates per sample, which the app previously conflated into
--            one "date received" field:
--              1. run_date       — when the lab actually tested the
--                                  sample (like a patient sample)
--              2. due_date       — the provider's submission deadline
--                                  for THIS sample/distribution
--              3. date_received  — when the provider's result/report
--                                  came back (already existed as
--                                  date_received; kept unchanged)
--
--            This distinction matters most for monthly-annual cycles
--            (e.g. RIQAS Chemistry: 1 sample/month x 12 months per
--            cycle) where each of the 12 samples has its own run date
--            and submission deadline, spread across the year.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0032_eqa_dynamic_discipline_and_samples.sql
-- =====================================================================

ALTER TABLE eqa_events ADD COLUMN IF NOT EXISTS run_date date;
ALTER TABLE eqa_events ADD COLUMN IF NOT EXISTS due_date date;

-- =====================================================================
-- End of migration 0033_eqa_run_due_dates.sql
-- =====================================================================
