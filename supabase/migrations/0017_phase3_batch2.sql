-- 0017_phase3_batch2.sql
-- 1. EQA cycle deadline reminders — same pattern as document review dates.
-- 2. Equipment <-> IQC machine linking, so an instrument's Equipment record
--    can show its recent IQC health alongside its own maintenance history.
-- (Batch entry for a full EQA panel needs no schema change — it just
-- creates several ordinary eqa_events rows in one action.)

alter table eqa_events add column if not exists next_cycle_date date;
alter table equipment add column if not exists qc_machine_id uuid references qc_machines(id) on delete set null;
