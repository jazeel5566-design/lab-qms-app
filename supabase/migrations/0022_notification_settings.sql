-- 0022_notification_settings.sql
-- Lets Admin turn each notification event on/off from the Settings tab,
-- without needing a code change. Read access is broad (any signed-in user)
-- since the check happens as a normal part of everyday actions like
-- creating a task — not just when an Admin is looking at Settings. Only
-- Admin can change the toggles.

create table notification_settings (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique check (event_key in ('task_assigned','task_overdue','nc_assigned','document_published','eqa_cycle_due')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into notification_settings (event_key) values
  ('task_assigned'), ('task_overdue'), ('nc_assigned'), ('document_published'), ('eqa_cycle_due')
on conflict (event_key) do nothing;

alter table notification_settings enable row level security;
create policy notification_settings_select on notification_settings for select using (auth.role() = 'authenticated');
create policy notification_settings_update on notification_settings for update using (current_access_role() = 'Admin') with check (current_access_role() = 'Admin');
create trigger trg_audit_notification_settings after update on notification_settings for each row execute function log_audit();
