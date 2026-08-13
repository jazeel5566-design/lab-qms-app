-- 0014_task_completion_approval.sql
-- The assignee marking a task "Done" no longer finishes it outright — it
-- now means "I'm done with my part," and stays awaiting approval until
-- Admin, QA Manager, or their deputy signs off. Same idea as IQC result
-- authorization: two people involved before something counts as closed.

alter table tasks add column if not exists completion_approved boolean not null default false;
alter table tasks add column if not exists approved_by uuid references personnel(id) on delete set null;
alter table tasks add column if not exists approved_at timestamptz;

-- If a task's status ever moves away from 'Done' — whether reopened by the
-- assignee or effectively rejected by a reviewer changing it back — any
-- prior approval is cleared automatically, so a stale old approval can
-- never silently carry over to a different round of work on the same task.
-- This only fires when status actually changes (not on the approval update
-- itself, which leaves status untouched at 'Done').
create or replace function reset_task_approval_if_not_done() returns trigger
language plpgsql as $$
begin
  if NEW.status is distinct from OLD.status and NEW.status is distinct from 'Done' then
    NEW.completion_approved := false;
    NEW.approved_by := null;
    NEW.approved_at := null;
  end if;
  return NEW;
end;
$$;
create trigger trg_reset_task_approval before update on tasks for each row execute function reset_task_approval_if_not_done();

-- Approving is restricted to the same governance roles as task assignment —
-- deliberately NOT open to "any non-Viewer" the way set_task_status is,
-- since this is the actual sign-off step, not routine status housekeeping.
create or replace function approve_task_completion(p_task_id uuid)
returns tasks language plpgsql security definer as $$
declare
  v_approver_id uuid;
  updated tasks%rowtype;
begin
  if coalesce(current_access_role(), 'Viewer') not in ('Admin', 'Deputy Admin', 'QA Manager', 'Deputy QA Manager') then
    raise exception 'Only Admin, QA Manager, or their deputy can approve task completion';
  end if;

  select id into v_approver_id from personnel where auth_user_id = auth.uid();

  update tasks set completion_approved = true, approved_by = v_approver_id, approved_at = now()
  where id = p_task_id and status = 'Done'
  returning * into updated;

  if not found then
    raise exception 'Task must be marked Done before it can be approved';
  end if;
  return updated;
end;
$$;
grant execute on function approve_task_completion(uuid) to authenticated;
