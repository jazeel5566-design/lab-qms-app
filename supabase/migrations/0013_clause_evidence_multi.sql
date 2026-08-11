-- 0013_clause_evidence_multi.sql
-- Replaces the single evidence_document_id column's UI usage with a proper
-- many-to-many table — a clause can now have multiple evidence documents,
-- and a document can support multiple clauses. The old column is left in
-- place (harmless, unused going forward) rather than dropped, so this stays
-- low-risk and reversible.

create table clause_evidence (
  id uuid primary key default gen_random_uuid(),
  clause_id text not null references clause_status(clause_id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  added_by uuid references personnel(id) on delete set null,
  added_at timestamptz not null default now(),
  unique (clause_id, document_id)
);
create index idx_clause_evidence_clause on clause_evidence(clause_id);

alter table clause_evidence enable row level security;
create policy clause_evidence_select on clause_evidence for select using (auth.role() = 'authenticated');
create policy clause_evidence_insert on clause_evidence for insert with check (can_edit());
create policy clause_evidence_delete on clause_evidence for delete using (can_edit());
create trigger trg_audit_clause_evidence after insert or update or delete on clause_evidence for each row execute function log_audit();

-- Carry forward anything already linked via the old single-document field,
-- so nothing set up before this migration gets lost.
insert into clause_evidence (clause_id, document_id)
select clause_id, evidence_document_id from clause_status
where evidence_document_id is not null
on conflict (clause_id, document_id) do nothing;
