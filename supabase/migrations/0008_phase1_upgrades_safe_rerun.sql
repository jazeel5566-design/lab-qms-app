-- 0008_phase1_upgrades_safe_rerun.sql
-- Safe-to-rerun version: only creates/adds what doesn't already exist.
-- Use this instead of the original 0008 file if you hit "already exists" errors.

-- ---------------------------------------------------------------------------
-- 1. Risk Register (Clause 5.6)
-- ---------------------------------------------------------------------------
create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  clause_id text references clause_status(clause_id) on delete set null,
  likelihood text not null check (likelihood in ('Low','Medium','High')),
  impact text not null check (impact in ('Low','Medium','High')),
  risk_level text generated always as (
    case
      when likelihood = 'High' and impact = 'High' then 'Critical'
      when likelihood = 'High' or impact = 'High' then 'High'
      when likelihood = 'Medium' and impact = 'Medium' then 'Medium'
      when likelihood = 'Low' and impact = 'Low' then 'Low'
      else 'Medium'
    end
  ) stored,
  mitigation text,
  owner_id uuid references personnel(id) on delete set null,
  status text not null default 'Open' check (status in ('Open','Mitigating','Monitoring','Closed')),
  identified_date date not null default current_date,
  last_reviewed date,
  next_review_date date,
  created_at timestamptz not null default now()
);
create index if not exists idx_risks_status on risks(status);

alter table risks enable row level security;

drop policy if exists risks_select on risks;
create policy risks_select on risks for select using (auth.role() = 'authenticated');
drop policy if exists risks_insert on risks;
create policy risks_insert on risks for insert with check (can_edit());
drop policy if exists risks_update on risks;
create policy risks_update on risks for update using (can_edit()) with check (can_edit());
drop policy if exists risks_delete on risks;
create policy risks_delete on risks for delete using (can_edit());

drop trigger if exists trg_audit_risks on risks;
create trigger trg_audit_risks after insert or update or delete on risks for each row execute function log_audit();

-- ---------------------------------------------------------------------------
-- 2. Management Review records (Clause 8.9)
-- ---------------------------------------------------------------------------
create table if not exists management_reviews (
  id uuid primary key default gen_random_uuid(),
  review_date date not null default current_date,
  attendees text,
  metrics_snapshot jsonb,
  inputs_reviewed text,
  decisions text,
  actions_arising text,
  conducted_by uuid references personnel(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table management_reviews enable row level security;

drop policy if exists mgmt_reviews_select on management_reviews;
create policy mgmt_reviews_select on management_reviews for select using (auth.role() = 'authenticated');
drop policy if exists mgmt_reviews_insert on management_reviews;
create policy mgmt_reviews_insert on management_reviews for insert with check (can_see_audit_backup());
drop policy if exists mgmt_reviews_update on management_reviews;
create policy mgmt_reviews_update on management_reviews for update using (can_see_audit_backup()) with check (can_see_audit_backup());
drop policy if exists mgmt_reviews_delete on management_reviews;
create policy mgmt_reviews_delete on management_reviews for delete using (can_see_audit_backup());

drop trigger if exists trg_audit_management_reviews on management_reviews;
create trigger trg_audit_management_reviews after insert or update or delete on management_reviews for each row execute function log_audit();

-- ---------------------------------------------------------------------------
-- 3. NC/CAPA effectiveness check (extends existing nonconformities table)
-- ---------------------------------------------------------------------------
alter table nonconformities add column if not exists effectiveness_check_due date;
alter table nonconformities add column if not exists effectiveness_check_result text
  check (effectiveness_check_result in ('Effective','Not effective','Pending'));
alter table nonconformities add column if not exists effectiveness_notes text;
alter table nonconformities add column if not exists effectiveness_verified_by uuid references personnel(id) on delete set null;
alter table nonconformities add column if not exists effectiveness_verified_at timestamptz;

-- ---------------------------------------------------------------------------
-- 4. Clause register evidence linking (extends existing clause_status table)
-- ---------------------------------------------------------------------------
alter table clause_status add column if not exists evidence_document_id uuid references documents(id) on delete set null;
