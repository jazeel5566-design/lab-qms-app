-- 0006_require_auth_for_select.sql
-- FIX: several SELECT policies in 0002 were written as `using (true)`, which
-- means "readable by anyone, including a request that never logged in at
-- all" — since the anon key is public by design, that would have made every
-- clause, task, NC, IQC result, etc. world-readable without authentication.
-- This tightens every one of them to require a logged-in session, matching
-- the personnel_select policy's pattern from the start.

drop policy clause_status_select on clause_status;
create policy clause_status_select on clause_status for select using (auth.role() = 'authenticated');

drop policy tasks_select on tasks;
create policy tasks_select on tasks for select using (auth.role() = 'authenticated');

drop policy ncs_select on nonconformities;
create policy ncs_select on nonconformities for select using (auth.role() = 'authenticated');

drop policy competency_select on competency_records;
create policy competency_select on competency_records for select using (auth.role() = 'authenticated');

drop policy equipment_select on equipment;
create policy equipment_select on equipment for select using (auth.role() = 'authenticated');

drop policy equipment_records_select on equipment_records;
create policy equipment_records_select on equipment_records for select using (auth.role() = 'authenticated');

drop policy qc_machines_select on qc_machines;
create policy qc_machines_select on qc_machines for select using (auth.role() = 'authenticated');

drop policy qc_parameters_select on qc_parameters;
create policy qc_parameters_select on qc_parameters for select using (auth.role() = 'authenticated');

drop policy qc_controls_select on qc_controls;
create policy qc_controls_select on qc_controls for select using (auth.role() = 'authenticated');

drop policy eqa_select on eqa_events;
create policy eqa_select on eqa_events for select using (auth.role() = 'authenticated');

drop policy documents_select on documents;
create policy documents_select on documents for select using (auth.role() = 'authenticated');

drop policy qc_runs_select on qc_runs;
create policy qc_runs_select on qc_runs for select using (auth.role() = 'authenticated');
