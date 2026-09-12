-- =====================================================================
-- Migration: 0038_nc_number_per_lab_unique.sql
-- Purpose:   Fixes "duplicate key value violates unique constraint
--            nonconformities_nc_number_key".
--
--            Root cause: nc_number was declared globally unique
--            (`nc_number text unique not null`, 0001 migration) — one
--            NC-001 across the ENTIRE system. But generate_nc_number()
--            (0037) computes the next number by counting NCs WITHIN one
--            lab only, consistent with how every other lab-separated
--            sequence in this app works. So a brand-new lab's first NC
--            also computes as "NC-001" — which collides with
--            Biochemistry's (or any other lab's) existing "NC-001".
--
--            Fix: make the uniqueness constraint scoped per lab
--            (laboratory_id, nc_number) instead of nc_number alone, so
--            each lab has its own independent NC-001, NC-002, ... —
--            matching generate_nc_number()'s actual behavior and every
--            other lab-scoped identifier in this app.
--
-- NOTE:      This has been applied directly against production via the
--            Supabase SQL editor on 2026-08-21.
--
-- Depends on: 0037_nc_workflow_redesign.sql
-- =====================================================================

ALTER TABLE nonconformities DROP CONSTRAINT IF EXISTS nonconformities_nc_number_key;
ALTER TABLE nonconformities ADD CONSTRAINT nonconformities_lab_nc_number_key UNIQUE (laboratory_id, nc_number);

-- =====================================================================
-- End of migration 0038_nc_number_per_lab_unique.sql
-- =====================================================================
