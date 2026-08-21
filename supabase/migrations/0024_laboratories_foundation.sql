-- 0024_laboratories_foundation.sql
--
-- Introduces genuine per-laboratory separation (e.g. Biochemistry,
-- Hematology as fully separate workspaces), starting with the foundation
-- plus two representative modules: Clause register and Tasks. The
-- remaining modules (NCs, Documents, Equipment, IQC, EQAS, Competency)
-- follow in a later migration, once this foundation is confirmed working.
--
-- Existing data did not previously belong to any laboratory. To avoid
-- breaking anything already in the database, this migration:
--   1. Creates the new tables.
--   2. Auto-creates one "Default" laboratory.
--   3. Assigns every existing staff member to it.
--   4. Backfills every existing clause_status/tasks/nonconformities row
--      to belong to it.
--   5. Only THEN makes laboratory_id required going forward.
-- After this runs, an Admin can rename "Default" to something real (e.g.
-- "Hematology"), and create additional laboratories as needed.

create table laboratories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table personnel_laboratories (
  id uuid primary key default gen_random_uuid(),
  personnel_id uuid not null references personnel(id) on delete cascade,
  laboratory_id uuid not null references laboratories(id) on delete cascade,
  unique (personnel_id, laboratory_id)
);
create index idx_personnel_laboratories_personnel on personnel_laboratories(personnel_id);

-- Admin can access every laboratory regardless of explicit assignment,
-- consistent with Admin's existing role as the system-wide superuser
-- everywhere else in this application. Everyone else needs an explicit
-- assignment row.
create or replace function has_lab_access(lab_id uuid) returns boolean
language sql stable as $$
  select
    coalesce(current_access_role(), 'Viewer') = 'Admin'
    or exists (
      select 1 from personnel_laboratories pl
      join personnel p on p.id = pl.personnel_id
      where p.auth_user_id = auth.uid() and pl.laboratory_id = lab_id
    );
$$;

alter table laboratories enable row level security;
create policy laboratories_select on laboratories for select using (auth.role() = 'authenticated');
create policy laboratories_insert on laboratories for insert with check (current_access_role() = 'Admin');
create policy laboratories_update on laboratories for update using (current_access_role() = 'Admin') with check (current_access_role() = 'Admin');

alter table personnel_laboratories enable row level security;
create policy personnel_laboratories_select on personnel_laboratories for select using (auth.role() = 'authenticated');
create policy personnel_laboratories_insert on personnel_laboratories for insert with check (current_access_role() = 'Admin');
create policy personnel_laboratories_delete on personnel_laboratories for delete using (current_access_role() = 'Admin');
create trigger trg_audit_laboratories after insert or update or delete on laboratories for each row execute function log_audit();

-- ---------------------------------------------------------------------------
-- Safe backfill: create the Default laboratory, assign every existing
-- staff member to it, before laboratory_id becomes required anywhere.
-- ---------------------------------------------------------------------------
insert into laboratories (name) values ('Default') on conflict (name) do nothing;

insert into personnel_laboratories (personnel_id, laboratory_id)
select p.id, (select id from laboratories where name = 'Default')
from personnel p
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Clause register — per laboratory
-- ---------------------------------------------------------------------------
alter table clause_status add column if not exists laboratory_id uuid references laboratories(id) on delete cascade;
update clause_status set laboratory_id = (select id from laboratories where name = 'Default') where laboratory_id is null;
alter table clause_status alter column laboratory_id set not null;

alter table clause_status drop constraint if exists clause_status_clause_id_key;
alter table clause_status add constraint clause_status_clause_id_lab_key unique (clause_id, laboratory_id);

drop policy if exists clause_status_select on clause_status;
create policy clause_status_select on clause_status for select using (auth.role() = 'authenticated' and has_lab_access(laboratory_id));
drop policy if exists clause_status_insert on clause_status;
create policy clause_status_insert on clause_status for insert with check (can_edit() and has_lab_access(laboratory_id));
drop policy if exists clause_status_update on clause_status;
create policy clause_status_update on clause_status for update using (can_edit() and has_lab_access(laboratory_id)) with check (can_edit() and has_lab_access(laboratory_id));

-- ---------------------------------------------------------------------------
-- Tasks — per laboratory
-- ---------------------------------------------------------------------------
alter table tasks add column if not exists laboratory_id uuid references laboratories(id) on delete cascade;
update tasks set laboratory_id = (select id from laboratories where name = 'Default') where laboratory_id is null;
alter table tasks alter column laboratory_id set not null;

drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks for select using (auth.role() = 'authenticated' and has_lab_access(laboratory_id));
drop policy if exists tasks_insert on tasks;
create policy tasks_insert on tasks for insert with check (can_assign_tasks() and has_lab_access(laboratory_id));
drop policy if exists tasks_update on tasks;
create policy tasks_update on tasks for update using (can_assign_tasks() and has_lab_access(laboratory_id)) with check (can_assign_tasks() and has_lab_access(laboratory_id));
drop policy if exists tasks_delete on tasks;
create policy tasks_delete on tasks for delete using (can_assign_tasks() and has_lab_access(laboratory_id));

-- ---------------------------------------------------------------------------
-- Nonconformities — per laboratory
-- ---------------------------------------------------------------------------
alter table nonconformities add column if not exists laboratory_id uuid references laboratories(id) on delete cascade;
update nonconformities set laboratory_id = (select id from laboratories where name = 'Default') where laboratory_id is null;
alter table nonconformities alter column laboratory_id set not null;

-- IMPORTANT: the real policy names on this table are ncs_*, not
-- nonconformities_* (verified directly against 0002_row_level_security.sql
-- before writing this — guessing wrong here would have silently left the
-- old, fully-open policy active underneath this one, since Postgres OR's
-- multiple permissive policies together rather than replacing them).
drop policy if exists ncs_select on nonconformities;
create policy ncs_select on nonconformities for select using (auth.role() = 'authenticated' and has_lab_access(laboratory_id));
drop policy if exists ncs_insert on nonconformities;
create policy ncs_insert on nonconformities for insert with check (can_edit() and has_lab_access(laboratory_id));
drop policy if exists ncs_update on nonconformities;
create policy ncs_update on nonconformities for update using (can_edit() and has_lab_access(laboratory_id)) with check (can_edit() and has_lab_access(laboratory_id));
drop policy if exists ncs_delete on nonconformities;
create policy ncs_delete on nonconformities for delete using (can_edit() and has_lab_access(laboratory_id));

-- ---------------------------------------------------------------------------
-- create_next_recurrence (originally from 0011_phase2_batch1.sql) predates
-- laboratories entirely — its INSERT never set laboratory_id, which would
-- start failing the moment laboratory_id becomes required above. Recreating
-- it here to carry the parent task's own laboratory into its next occurrence.
-- ---------------------------------------------------------------------------
create or replace function create_next_recurrence(p_completed_task_id uuid)
returns tasks language plpgsql security definer as $$
declare
  t tasks%rowtype;
  new_task tasks%rowtype;
  next_due date;
begin
  if coalesce(current_access_role(), 'Viewer') = 'Viewer' then
    raise exception 'Viewers cannot complete tasks';
  end if;

  select * into t from tasks where id = p_completed_task_id;
  if not found or not t.is_recurring or t.recurrence_interval_days is null then
    return null;
  end if;

  next_due := coalesce(t.due_date, current_date) + t.recurrence_interval_days;
  insert into tasks (title, clause_id, assigned_to, due_date, priority, status, is_recurring, recurrence_interval_days, recurrence_parent_id, laboratory_id)
  values (t.title, t.clause_id, t.assigned_to, next_due, t.priority, 'Open', true, t.recurrence_interval_days, t.id, t.laboratory_id)
  returning * into new_task;

  return new_task;
end;
$$;
