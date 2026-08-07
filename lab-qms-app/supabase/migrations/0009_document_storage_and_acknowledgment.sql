-- 0009_document_storage_and_acknowledgment.sql
-- Two things:
--   1. A storage_path column on documents, for real uploaded files
--      (alongside the existing url column, which stays for external links —
--      a document can use either).
--   2. document_acknowledgments — tracks which staff have confirmed they've
--      read the CURRENT version of a controlled document. This is what
--      turns "we published a new SOP" into "we can prove staff read it."
--
-- NOTE: this migration does NOT create the storage bucket itself — that has
-- to be done once via the Supabase dashboard (Storage -> New bucket, name
-- it exactly "documents", set it to Private). This migration only sets up
-- the access rules for that bucket once it exists.

alter table documents add column if not exists storage_path text;

create table if not exists document_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  personnel_id uuid not null references personnel(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (document_id, personnel_id)
);
create index if not exists idx_doc_ack_document on document_acknowledgments(document_id);

alter table document_acknowledgments enable row level security;

drop policy if exists doc_ack_select on document_acknowledgments;
create policy doc_ack_select on document_acknowledgments for select using (auth.role() = 'authenticated');

-- A person can only ever acknowledge AS THEMSELVES — enforced server-side via
-- current_personnel_id(), so the client can't record someone else as having
-- read a document they haven't actually seen.
drop policy if exists doc_ack_insert on document_acknowledgments;
create policy doc_ack_insert on document_acknowledgments for insert
  with check (personnel_id = current_personnel_id());

drop policy if exists doc_ack_delete on document_acknowledgments;
create policy doc_ack_delete on document_acknowledgments for delete using (current_access_role() = 'Admin');

drop trigger if exists trg_audit_doc_ack on document_acknowledgments;
create trigger trg_audit_doc_ack after insert or update or delete on document_acknowledgments for each row execute function log_audit();

-- ---------------------------------------------------------------------------
-- Storage bucket access rules. Requires the "documents" bucket to already
-- exist (create it via the dashboard first, then run this).
-- Files are expected to be uploaded under a path like:
--   controlled/<filename>   — only Admin/QA Manager/Deputy QA Manager may add/remove
--   personal/<filename>     — anyone who can_edit() may add/remove
--   general/<filename>      — anyone who can_edit() may add/remove
-- ---------------------------------------------------------------------------
drop policy if exists documents_bucket_select on storage.objects;
create policy documents_bucket_select on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

drop policy if exists documents_bucket_insert_controlled on storage.objects;
create policy documents_bucket_insert_controlled on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = 'controlled' and can_publish_controlled_docs());

drop policy if exists documents_bucket_insert_other on storage.objects;
create policy documents_bucket_insert_other on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] <> 'controlled' and can_edit());

drop policy if exists documents_bucket_delete_controlled on storage.objects;
create policy documents_bucket_delete_controlled on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = 'controlled' and can_publish_controlled_docs());

drop policy if exists documents_bucket_delete_other on storage.objects;
create policy documents_bucket_delete_other on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] <> 'controlled' and can_edit());
