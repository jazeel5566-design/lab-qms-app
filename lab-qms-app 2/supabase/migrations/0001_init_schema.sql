-- 0001_init_schema.sql
-- Lab QMS — core schema. Run this first.
-- Every table gets a uuid primary key for consistency (business keys like
-- clause_id / nc_number / record_card_number are separate unique columns).

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- personnel: staff directory + the link to Supabase Auth.
-- NOTE: no password column here on purpose — Supabase Auth (auth.users) owns
-- credentials. See src/auth.js for the record-card-number login pattern.
-- ---------------------------------------------------------------------------
create table personnel (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  job_title text,                -- free-text job title (was "role" in the app)
  email text,
  record_card_number text unique not null,   -- this is the login USERNAME
  access_role text not null default 'Technologist'
    check (access_role in ('Admin','Deputy Admin','QA Manager','Deputy QA Manager','Technologist','Viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clause_status: one row per ISO 15189:2022 sub-clause (34 total, Clauses 4-8)
-- ---------------------------------------------------------------------------
create table clause_status (
  id uuid primary key default gen_random_uuid(),
  clause_id text unique not null,           -- e.g. '5.7'
  status text not null default 'Not assessed'
    check (status in ('Not assessed','Compliant','Partial','Non-conformant')),
  owner_id uuid references personnel(id) on delete set null,
  last_reviewed date,
  notes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  clause_id text references clause_status(clause_id) on delete set null,
  assigned_to uuid references personnel(id) on delete set null,
  due_date date,
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  status text not null default 'Open' check (status in ('Open','In progress','Done')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- nonconformities (NC/CAPA)
-- ---------------------------------------------------------------------------
create table nonconformities (
  id uuid primary key default gen_random_uuid(),
  nc_number text unique not null,
  title text not null,
  description text,
  clause_id text references clause_status(clause_id) on delete set null,
  severity text check (severity in ('Minor','Major','Critical')),
  source text,
  status text not null default 'Open'
    check (status in ('Open','Investigating','Action planned','Action implemented','Verified','Closed')),
  assigned_to uuid references personnel(id) on delete set null,
  raised_by uuid references personnel(id) on delete set null,
  verified_by uuid references personnel(id) on delete set null,
  root_cause text,
  corrective_action text,
  preventive_action text,
  evidence text,
  due_date date,
  closed_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- competency_records (Clause 6.1)
-- ---------------------------------------------------------------------------
create table competency_records (
  id uuid primary key default gen_random_uuid(),
  personnel_id uuid references personnel(id) on delete cascade,
  type text,        -- Initial/Ongoing assessment, Training, Certification, Induction
  title text,
  method text,
  assessor text,
  result text,
  date date,
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- equipment (Clauses 6.3 / 6.4)
-- ---------------------------------------------------------------------------
create table equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text,
  serial_number text,
  category text,
  location text,
  commission_date date,
  status text not null default 'In service'
    check (status in ('In service','Out of service','Under qualification','Decommissioned')),
  created_at timestamptz not null default now()
);

create table equipment_records (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  type text not null,   -- IQ, OQ, PQ, Calibration, Preventive maintenance, Corrective maintenance, Verification
  date date,
  due_date date,
  performed_by uuid references personnel(id) on delete set null,
  result text check (result in ('Pass','Fail','Conditional pass','Pending')),
  document_ref text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- IQC: machines / parameters / controls / runs
-- ---------------------------------------------------------------------------
create table qc_machines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text,
  discipline text not null check (discipline in ('Hematology','Biochemistry','Immunochemistry')),
  created_at timestamptz not null default now()
);

create table qc_parameters (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references qc_machines(id) on delete cascade,
  name text not null,
  unit text
);

create table qc_controls (
  id uuid primary key default gen_random_uuid(),
  parameter_id uuid not null references qc_parameters(id) on delete cascade,
  level text not null check (level in ('Level 1 (Low)','Level 2 (Normal)','Level 3 (High)')),
  lot_number text,
  mean numeric not null,
  sd numeric not null,
  expiry_date date
);

create table qc_runs (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references qc_controls(id) on delete cascade,
  date date not null,
  time time,
  value numeric not null,
  operator uuid references personnel(id) on delete set null,
  authorized boolean not null default false,
  authorized_by uuid references personnel(id) on delete set null,
  authorized_at timestamptz,
  comment text,
  created_at timestamptz not null default now()
);
-- Note: Westgard rule violations (1-2s, 1-3s, 2-2s, R-4s, 4-1s, 10x) are
-- deliberately NOT stored here. Compute them at query time from mean/sd/history
-- (see src/api/qc.js), same as the original app — this guarantees the flags
-- are always derived from current data, never stale or tamperable.

-- ---------------------------------------------------------------------------
-- EQAS
-- ---------------------------------------------------------------------------
create table eqa_events (
  id uuid primary key default gen_random_uuid(),
  discipline text not null check (discipline in ('Hematology','Biochemistry','Immunochemistry')),
  machine_id uuid references qc_machines(id) on delete set null,
  parameter text not null,
  provider text,
  cycle text,
  date_received date,
  lab_result numeric,
  peer_mean numeric,
  peer_sd numeric,
  sdi numeric generated always as (
    case when peer_sd is not null and peer_sd <> 0
      then round(((lab_result - peer_mean) / peer_sd)::numeric, 2)
      else null end
  ) stored,
  evaluation text not null default 'Not yet received'
    check (evaluation in ('Not yet received','Satisfactory','Marginal','Unsatisfactory')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- documents (linked SOPs / certificates / reports)
-- ---------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  related_to text,
  url text,                -- swap for storage_path once real uploads are wired up
  uploaded_by uuid references personnel(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  notes text
);

-- ---------------------------------------------------------------------------
-- audit_log — written only by the trigger in 0003, never directly by clients
-- ---------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  actor_id uuid references personnel(id) on delete set null,
  actor_name text not null default 'Unknown',
  actor_role text not null default '',
  entity text not null,
  action text not null,       -- INSERT / UPDATE / DELETE
  record_id uuid,
  summary text
);

create index idx_tasks_assigned_to on tasks(assigned_to);
create index idx_ncs_status on nonconformities(status);
create index idx_qc_runs_control_id on qc_runs(control_id);
create index idx_qc_runs_date on qc_runs(date);
create index idx_audit_log_ts on audit_log(ts desc);
