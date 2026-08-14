-- 0015_phase3_batch1.sql
-- 1. NC-to-NC recurrence linking
-- 2. Task comments
-- 3. Competency two-party sign-off (assessee confirms their own record)
-- (Audit log export needs no schema change — it's a frontend feature reading
-- data that's already there.)

alter table nonconformities add column if not exists related_nc_id uuid references nonconformities(id) on delete set null;

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references personnel(id) on delete set null,
  comment text not null,
  created_at timestamptz not null default now()
);
create index idx_task_comments_task on task_comments(task_id);

alter table task_comments enable row level security;
create policy task_comments_select on task_comments for select using (auth.role() = 'authenticated');
create policy task_comments_insert on task_comments for insert with check (can_edit());
create policy task_comments_delete on task_comments for delete using (current_access_role() = 'Admin' or author_id = current_personnel_id());
create trigger trg_audit_task_comments after insert or update or delete on task_comments for each row execute function log_audit();

alter table competency_records add column if not exists assessee_confirmed boolean not null default false;
alter table competency_records add column if not exists assessee_confirmed_at timestamptz;

-- Only the person the record is actually about can confirm it — checked
-- server-side against their own personnel row, not just left to the UI to
-- enforce, so this can't be worked around by editing someone else's record.
create or replace function confirm_competency_assessment(p_record_id uuid)
returns competency_records language plpgsql security definer as $$
declare
  v_caller_personnel_id uuid;
  updated competency_records%rowtype;
begin
  select id into v_caller_personnel_id from personnel where auth_user_id = auth.uid();

  update competency_records set assessee_confirmed = true, assessee_confirmed_at = now()
  where id = p_record_id and personnel_id = v_caller_personnel_id
  returning * into updated;

  if not found then
    raise exception 'You can only confirm your own competency assessment records';
  end if;
  return updated;
end;
$$;
grant execute on function confirm_competency_assessment(uuid) to authenticated;
