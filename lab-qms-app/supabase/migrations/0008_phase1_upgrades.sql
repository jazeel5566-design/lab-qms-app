-- 0008_phase1_upgrades.sql
-- Phase 1 of the upgrade roadmap: closes accreditation-blocking gaps.
--   1. Risk Register (Clause 5.6) — new table
--   2. Management Review records (Clause 8.9) — new table
--   3. NC/CAPA effectiveness check — new columns on nonconformities
--   4. Clause register evidence linking — new column linking a clause to a
--      real Documents row instead of only free-text notes

-- ---------------------------------------------------------------------------
-- 1. Risk Register (Clause 5.6)
-- ---------------------------------------------------------------------------
create table risks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,                    -- e.g. Pre-examination, Examination, Post-examination, IT, Facilities, Personnel
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
create index idx_risks_status on risks(status);

alter table risks enable row level security;
create policy risks_select on risks for select using (auth.role() = 'authenticated');
create policy risks_insert on risks for insert with check (can_edit());
create policy risks_update on risks for update using (can_edit()) with check (can_edit());
create policy risks_delete on risks for delete using (can_edit());
create trigger trg_audit_risks after insert or update or delete on risks for each row execute function log_audit();

-- ---------------------------------------------------------------------------
-- 2. Management Review records (Clause 8.9)
-- ---------------------------------------------------------------------------
create table management_reviews (
  id uuid primary key default gen_random_uuid(),
  review_date date not null default current_date,
  attendees text,                          -- free text list of names/roles present
  -- Snapshot of key metrics AT THE TIME of the review, so the record stays
  -- meaningful even as live data changes afterward — this is what makes it
  -- a real record rather than just a link to the live Dashboard.
  metrics_snapshot jsonb,
  inputs_reviewed text,                    -- what was discussed (NC trends, IQC/EQA performance, audit results, etc.)
  decisions text,                          -- what was decided
  actions_arising text,                    -- free text summary; individual items should also be created as linked Tasks
  conducted_by uuid references personnel(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table management_reviews enable row level security;
create policy mgmt_reviews_select on management_reviews for select using (auth.role() = 'authenticated');
create policy mgmt_reviews_insert on management_reviews for insert with check (can_see_audit_backup());
create policy mgmt_reviews_update on management_reviews for update using (can_see_audit_backup()) with check (can_see_audit_backup());
create policy mgmt_reviews_delete on management_reviews for delete using (can_see_audit_backup());
create trigger trg_audit_management_reviews after insert or update or delete on management_reviews for each row execute function log_audit();
-- Note: can_see_audit_backup() = Admin or QA Manager only — management review
-- records are restricted to the same roles who already see audit/backup data,
-- since both are governance-level, not day-to-day operational, functions.

-- ---------------------------------------------------------------------------
-- 3. NC/CAPA effectiveness check (extends existing nonconformities table)
-- ---------------------------------------------------------------------------
alter table nonconformities add column effectiveness_check_due date;
alter table nonconformities add column effectiveness_check_result text
  check (effectiveness_check_result in ('Effective','Not effective','Pending'));
alter table nonconformities add column effectiveness_notes text;
alter table nonconformities add column effectiveness_verified_by uuid references personnel(id) on delete set null;
alter table nonconformities add column effectiveness_verified_at timestamptz;

-- ---------------------------------------------------------------------------
-- 4. Clause register evidence linking (extends existing clause_status table)
-- ---------------------------------------------------------------------------
alter table clause_status add column evidence_document_id uuid references documents(id) on delete set null;
