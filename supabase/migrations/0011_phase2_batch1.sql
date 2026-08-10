-- 0011_phase2_batch1.sql
-- Phase 2, first batch:
--   1. Recurring tasks — a task can be marked to auto-recreate itself on a
--      schedule when completed.
--   2. Document review reminders — controlled documents get a "next review
--      due" date, independent of version publishing.
--   3. EQA -> NC linking — records which NC (if any) was raised from a given
--      EQA result, so the "create NC from this result" shortcut doesn't
--      create duplicates and the link is traceable both ways.
-- (Competency matrix and NC trend analysis need no schema changes — both are
-- pure client-side views over data that already exists.)

alter table tasks add column if not exists is_recurring boolean not null default false;
alter table tasks add column if not exists recurrence_interval_days integer;
alter table tasks add column if not exists recurrence_parent_id uuid references tasks(id) on delete set null;

-- Creating a task is normally Admin/QA Manager/deputy-only (0002), but ANY
-- non-Viewer can mark a task Done — including a recurring one. This function
-- lets completing a recurring task auto-create the next occurrence
-- regardless of who completed it, without granting general task-creation
-- rights: it only ever clones an EXISTING recurring task's own fields, never
-- accepts caller-supplied task details, so it can't be used to create an
-- arbitrary task under a different guise.
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
  insert into tasks (title, clause_id, assigned_to, due_date, priority, status, is_recurring, recurrence_interval_days, recurrence_parent_id)
  values (t.title, t.clause_id, t.assigned_to, next_due, t.priority, 'Open', true, t.recurrence_interval_days, t.id)
  returning * into new_task;

  return new_task;
end;
$$;
grant execute on function create_next_recurrence(uuid) to authenticated;

alter table documents add column if not exists next_review_date date;

alter table eqa_events add column if not exists linked_nc_id uuid references nonconformities(id) on delete set null;
