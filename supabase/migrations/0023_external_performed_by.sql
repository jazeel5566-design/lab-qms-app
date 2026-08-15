-- 0023_external_performed_by.sql
-- performed_by only ever pointed at a registered personnel account —
-- meaning an external analyser engineer with no login here couldn't be
-- recorded at all. Adds a free-text alternative alongside it; a record
-- uses exactly one of the two, never both.

alter table equipment_records add column if not exists performed_by_external text;
