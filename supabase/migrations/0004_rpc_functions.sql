-- 0004_rpc_functions.sql
-- Two controlled entry points for actions that need a NARROWER rule than
-- "can you write to this whole table":
--   - any non-Viewer can update a task's STATUS, even if they can't create/
--     reassign/delete tasks (raw UPDATE on tasks is assigner-only, per 0002)
--   - only Admin/QA Manager can AUTHORIZE an IQC result, and the authorizer's
--     identity is taken from the server session, never from client input —
--     this is what makes "authorize as yourself" actually enforced rather
--     than just a UI convention.

create or replace function set_task_status(p_task_id uuid, p_status text)
returns void language plpgsql security definer as $$
begin
  if p_status not in ('Open','In progress','Done') then
    raise exception 'Invalid status: %', p_status;
  end if;
  if coalesce(current_access_role(), 'Viewer') = 'Viewer' then
    raise exception 'Viewers cannot update task status';
  end if;
  update tasks set status = p_status where id = p_task_id;
end;
$$;

create or replace function authorize_qc_run(p_run_id uuid)
returns void language plpgsql security definer as $$
declare
  v_role text := current_access_role();
  v_person_id uuid := current_personnel_id();
begin
  if v_role not in ('Admin','QA Manager') then
    raise exception 'Only Admin or QA Manager can authorize IQC results (signed in role: %)', coalesce(v_role, 'none');
  end if;
  if v_person_id is null then
    raise exception 'No personnel record linked to this account';
  end if;

  update qc_runs
  set authorized = true,
      authorized_by = v_person_id,
      authorized_at = now()
  where id = p_run_id and authorized = false;

  if not found then
    raise exception 'Run not found or already authorized';
  end if;
end;
$$;

-- Let any authenticated client call these (the functions enforce the real
-- restriction internally; GRANT here only controls who can attempt the call).
grant execute on function set_task_status(uuid, text) to authenticated;
grant execute on function authorize_qc_run(uuid) to authenticated;
