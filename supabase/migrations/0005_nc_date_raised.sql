-- 0005_nc_date_raised.sql
-- The app's NC form captures a "date raised" distinct from the row's
-- created_at timestamp (e.g. backdating an NC to when it was actually
-- observed, not when it was typed into the system). Add the column.

alter table nonconformities add column date_raised date;

-- Backfill any existing rows from created_at so the column isn't left null
-- for data that predates this migration.
update nonconformities set date_raised = created_at::date where date_raised is null;
