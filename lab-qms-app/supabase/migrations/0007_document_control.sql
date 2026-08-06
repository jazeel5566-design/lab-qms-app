-- 0007_document_control.sql
-- Adds three things to the Documents module:
--   1. Version control for controlled documents (SOP, QSP, Policy, Manual) —
--      documents sharing a document_code are versions of the same controlled
--      document; only one is_current=true row exists per code at a time, so
--      everyone browsing the register automatically sees the latest version.
--   2. Personal documents — a document can optionally be linked to a specific
--      staff member (e.g. a professional licence/registration), independent
--      of the version-control mechanism above.
--   3. Publishing rights — only Admin, QA Manager, or Deputy QA Manager can
--      insert, update, or delete a controlled-category document. Any
--      non-Viewer can still manage general documents and personal documents.

alter table documents add column document_code text;
alter table documents add column version integer not null default 1;
alter table documents add column is_current boolean not null default true;
alter table documents add column personnel_id uuid references personnel(id) on delete set null;

create index idx_documents_document_code on documents(document_code);
create index idx_documents_personnel_id on documents(personnel_id);

-- ---------------------------------------------------------------------------
-- Controlled-category check + publishing permission, mirroring the
-- can_edit()/can_authorize_iqc() pattern from 0002.
-- ---------------------------------------------------------------------------
create or replace function is_controlled_category(cat text) returns boolean
language sql immutable as $$
  select cat in ('SOP', 'QSP', 'Policy', 'Manual');
$$;

create or replace function can_publish_controlled_docs() returns boolean
language sql stable as $$
  select current_access_role() in ('Admin', 'QA Manager', 'Deputy QA Manager');
$$;

-- ---------------------------------------------------------------------------
-- Replace documents INSERT/DELETE policies, and add an UPDATE policy
-- (needed now to mark a superseded version's is_current = false when a new
-- version is published — documents were create/delete-only before this).
-- ---------------------------------------------------------------------------
drop policy documents_insert on documents;
create policy documents_insert on documents for insert with check (
  case when is_controlled_category(category) then can_publish_controlled_docs()
       else can_edit()
  end
);

create policy documents_update on documents for update
  using (
    case when is_controlled_category(category) then can_publish_controlled_docs()
         else can_edit()
    end
  )
  with check (
    case when is_controlled_category(category) then can_publish_controlled_docs()
         else can_edit()
    end
  );

drop policy documents_delete on documents;
create policy documents_delete on documents for delete using (
  case when is_controlled_category(category) then can_publish_controlled_docs()
       else can_edit()
  end
);
