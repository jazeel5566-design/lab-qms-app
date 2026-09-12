-- =====================================================================
-- Migration: 0036_nc_linked_task.sql
-- Purpose:   Lets an NC's "Assigned to" + "Target close date" create a
--            real task on that person's task list, due on the same date
--            — so NC follow-up shows up where staff actually work
--            (Tasks tab), not just inside the NC register.
--
--            linked_task_id tracks which task was created from a given
--            NC, so re-clicking "Create task" doesn't create a
--            duplicate, and the NC can show a confirmation/link to the
--            task once one exists — mirroring the existing pattern for
--            eqa_events.linked_nc_id (0001 migration).
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0035_seed_eqa_programs.sql
-- =====================================================================

ALTER TABLE nonconformities ADD COLUMN IF NOT EXISTS linked_task_id UUID REFERENCES tasks(id);

-- =====================================================================
-- End of migration 0036_nc_linked_task.sql
-- =====================================================================
