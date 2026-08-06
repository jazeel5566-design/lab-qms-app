-- 0002_row_level_security.sql
-- Enforces the permission matrix from Lab-QMS-Developer-Handoff.docx Section 6
-- at the DATABASE level. This is what closes the gap the original artifact
-- version had: there, a Technologist could bypass every UI restriction via
-- browser dev tools. Here, the database itself refuses the write.

-- Helper: look up the calling user's access_role from their personnel row.
-- security definer so it can read personnel regardless of RLS on that table.
create or replace function current_access_role() returns text
language sql stable security definer as $$
  select access_role from personnel where auth_user_id = auth.uid();
$$;

create or replace function current_personnel_id() returns uuid
language sql stable security definer as $$
  select id from personnel where auth_user_id = auth.uid();
$$;

-- Role groups, matching the app's JS logic exactly:
--   is_admin              -> 'Admin' only (NOT Deputy Admin — matches app's isAdmin check)
--   can_see_audit_backup  -> Admin or QA Manager only (not deputies)
--   can_assign_tasks      -> Admin, Deputy Admin, QA Manager, Deputy QA Manager
--   can_authorize_iqc     -> Admin or QA Manager only (deputies excluded — see handoff Section 6 footnote)
--   can_edit              -> anything except Viewer

create or replace function is_admin() returns boolean language sql stable as $$
  select current_access_role() = 'Admin';
$$;
create or replace function can_see_audit_backup() returns boolean language sql stable as $$
  select current_access_role() in ('Admin','QA Manager');
$$;
create or replace function can_assign_tasks() returns boolean language sql stable as $$
  select current_access_role() in ('Admin','Deputy Admin','QA Manager','Deputy QA Manager');
$$;
create or replace function can_authorize_iqc() returns boolean language sql stable as $$
  select current_access_role() in ('Admin','QA Manager');
$$;
create or replace function can_edit() returns boolean language sql stable as $$
  select coalesce(current_access_role(), 'Viewer') <> 'Viewer';
$$;

-- Enable RLS everywhere. Once enabled, ALL access is denied by default
-- except what an explicit policy allows.
alter table personnel enable row level security;
alter table clause_status enable row level security;
alter table tasks enable row level security;
alter table nonconformities enable row level security;
alter table competency_records enable row level security;
alter table equipment enable row level security;
alter table equipment_records enable row level security;
alter table qc_machines enable row level security;
alter table qc_parameters enable row level security;
alter table qc_controls enable row level security;
alter table qc_runs enable row level security;
alter table eqa_events enable row level security;
alter table documents enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- personnel
-- Everyone signed in can SELECT (needed for name dropdowns everywhere).
-- INSERT: Admin can add anyone at any access_role; OR a freshly-authenticated
--         user can create exactly one row for themselves at Technologist
--         level (this is the "I'm new here" self-registration flow).
-- UPDATE/DELETE: Admin only (record card number, password reset via Auth,
--         access role, removing staff).
-- ---------------------------------------------------------------------------
create policy personnel_select on personnel for select
  using (auth.role() = 'authenticated');

create policy personnel_insert_admin on personnel for insert
  with check (is_admin());

create policy personnel_insert_self_registration on personnel for insert
  with check (auth_user_id = auth.uid() and access_role = 'Technologist');

create policy personnel_update_admin on personnel for update
  using (is_admin()) with check (is_admin());

create policy personnel_delete_admin on personnel for delete
  using (is_admin());

-- ---------------------------------------------------------------------------
-- clause_status: anyone can view; anyone but a Viewer can edit; no delete.
-- ---------------------------------------------------------------------------
create policy clause_status_select on clause_status for select using (true);
create policy clause_status_insert on clause_status for insert with check (can_edit());
create policy clause_status_update on clause_status for update using (can_edit()) with check (can_edit());

-- ---------------------------------------------------------------------------
-- tasks: everyone can view. Creating/reassigning/deleting is assigner-only.
-- Status-only updates by anyone non-Viewer go through the set_task_status()
-- RPC in 0004, NOT through raw UPDATE — so raw UPDATE stays assigner-only.
-- ---------------------------------------------------------------------------
create policy tasks_select on tasks for select using (true);
create policy tasks_insert on tasks for insert with check (can_assign_tasks());
create policy tasks_update on tasks for update using (can_assign_tasks()) with check (can_assign_tasks());
create policy tasks_delete on tasks for delete using (can_assign_tasks());

-- ---------------------------------------------------------------------------
-- nonconformities, competency_records, equipment, equipment_records,
-- qc_machines, qc_parameters, qc_controls, eqa_events, documents:
-- view = everyone signed in; edit = anyone but a Viewer.
-- ---------------------------------------------------------------------------
create policy ncs_select on nonconformities for select using (true);
create policy ncs_insert on nonconformities for insert with check (can_edit());
create policy ncs_update on nonconformities for update using (can_edit()) with check (can_edit());
create policy ncs_delete on nonconformities for delete using (can_edit());

create policy competency_select on competency_records for select using (true);
create policy competency_insert on competency_records for insert with check (can_edit());
create policy competency_update on competency_records for update using (can_edit()) with check (can_edit());
create policy competency_delete on competency_records for delete using (can_edit());

create policy equipment_select on equipment for select using (true);
create policy equipment_insert on equipment for insert with check (can_edit());
create policy equipment_update on equipment for update using (can_edit()) with check (can_edit());
create policy equipment_delete on equipment for delete using (can_edit());

create policy equipment_records_select on equipment_records for select using (true);
create policy equipment_records_insert on equipment_records for insert with check (can_edit());
create policy equipment_records_update on equipment_records for update using (can_edit()) with check (can_edit());
create policy equipment_records_delete on equipment_records for delete using (can_edit());

create policy qc_machines_select on qc_machines for select using (true);
create policy qc_machines_insert on qc_machines for insert with check (can_edit());
create policy qc_machines_update on qc_machines for update using (can_edit()) with check (can_edit());
create policy qc_machines_delete on qc_machines for delete using (can_edit());

create policy qc_parameters_select on qc_parameters for select using (true);
create policy qc_parameters_insert on qc_parameters for insert with check (can_edit());
create policy qc_parameters_delete on qc_parameters for delete using (can_edit());

create policy qc_controls_select on qc_controls for select using (true);
create policy qc_controls_insert on qc_controls for insert with check (can_edit());
create policy qc_controls_delete on qc_controls for delete using (can_edit());

create policy eqa_select on eqa_events for select using (true);
create policy eqa_insert on eqa_events for insert with check (can_edit());
create policy eqa_update on eqa_events for update using (can_edit()) with check (can_edit());
create policy eqa_delete on eqa_events for delete using (can_edit());

create policy documents_select on documents for select using (true);
create policy documents_insert on documents for insert with check (can_edit());
create policy documents_delete on documents for delete using (can_edit());

-- ---------------------------------------------------------------------------
-- qc_runs: anyone but a Viewer can log a new result. Once a result is
-- authorized, it becomes read-only via raw UPDATE (authorization itself goes
-- through the authorize_qc_run() RPC in 0004, which is the ONLY path that can
-- ever set authorized = true).
-- ---------------------------------------------------------------------------
create policy qc_runs_select on qc_runs for select using (true);
create policy qc_runs_insert on qc_runs for insert with check (can_edit() and authorized = false);
create policy qc_runs_update on qc_runs for update
  using (can_edit() and authorized = false)
  with check (can_edit() and authorized = false);
create policy qc_runs_delete on qc_runs for delete using (can_edit() and authorized = false);

-- ---------------------------------------------------------------------------
-- audit_log: read-only to Admin/QA Manager. No client insert/update/delete
-- policy exists at all — only the SECURITY DEFINER trigger in 0003 can write
-- to this table, so it cannot be edited or erased by any application role.
-- ---------------------------------------------------------------------------
create policy audit_log_select on audit_log for select using (can_see_audit_backup());
