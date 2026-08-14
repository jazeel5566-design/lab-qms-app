-- 0018_equipment_record_evidence.sql
-- Qualification/maintenance records could only hold a free-text reference
-- (document_ref) before — no way to actually attach the certificate or
-- report itself. Adds the same url/storage_path pair documents already use,
-- so a record can carry a real uploaded file or an external link as proof.
-- document_ref is left as-is for any existing free-text notes.

alter table equipment_records add column if not exists url text;
alter table equipment_records add column if not exists storage_path text;

-- No new storage bucket policies needed: the existing policies from 0009
-- already allow any authenticated editor to upload into any folder other
-- than "controlled" — this will use folder "equipment", which already
-- matches documents_bucket_insert_other / documents_bucket_delete_other.
