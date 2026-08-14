-- 0016_task_templates.sql
-- Task templates so a recurring setup (monthly IQC review, quarterly
-- internal audit, etc.) can be saved once and reused, instead of retyping
-- the same title/priority/clause/recurrence every time. Same governance
-- role group as task creation itself, reusing the existing can_assign_tasks().
-- (Dashboard PDF export, EQA trend graphs, and document search all read
-- data that already exists — no schema changes needed for those.)

create table task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  default_priority text not null default 'Medium',
  default_clause_id text references clause_status(clause_id) on delete set null,
  is_recurring boolean not null default false,
  recurrence_interval_days integer,
  created_by uuid references personnel(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table task_templates enable row level security;
create policy task_templates_select on task_templates for select using (auth.role() = 'authenticated');
create policy task_templates_insert on task_templates for insert with check (can_assign_tasks());
create policy task_templates_update on task_templates for update using (can_assign_tasks()) with check (can_assign_tasks());
create policy task_templates_delete on task_templates for delete using (can_assign_tasks());
create trigger trg_audit_task_templates after insert or update or delete on task_templates for each row execute function log_audit();
