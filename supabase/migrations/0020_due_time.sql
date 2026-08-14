-- 0020_due_time.sql
-- Optional time-of-day alongside due dates, scoped to Tasks and NC/CAPA
-- specifically — the two places a precise deadline (not just "which day")
-- genuinely matters most. The date column itself is untouched, so every
-- existing overdue/comparison calculation throughout the app keeps working
-- exactly as before; this is purely an additive display/scheduling detail.

alter table tasks add column if not exists due_time text;
alter table nonconformities add column if not exists due_time text;
