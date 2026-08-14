-- 0021_machine_api_keys.sql
-- API keys for a unidirectional machine -> Lab QMS interface: an instrument
-- (or middleware sitting between it and the internet) can push a QC result
-- in, authenticated by key, via the ingest-qc-result Edge Function. The
-- system never queries or sends anything back to the machine — one direction
-- only, exactly as asked for.
--
-- Only the SHA-256 hash of each key is ever stored — the plaintext key is
-- shown once at creation time (via the create-api-key Edge Function) and
-- never recoverable afterward, same principle as a password.

create table machine_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_hash text not null unique,
  key_prefix text not null,  -- first few characters only, shown in the UI so a key can be identified without ever re-displaying the full value
  qc_machine_id uuid references qc_machines(id) on delete set null,  -- optional: restrict this key to feeding one specific machine's results
  created_by uuid references personnel(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table machine_api_keys enable row level security;
-- Admin-only in every direction — this is a real security boundary (whoever holds a key can write QC data), not routine data entry.
create policy machine_api_keys_select on machine_api_keys for select using (current_access_role() = 'Admin');
create policy machine_api_keys_insert on machine_api_keys for insert with check (current_access_role() = 'Admin');
create policy machine_api_keys_update on machine_api_keys for update using (current_access_role() = 'Admin') with check (current_access_role() = 'Admin');
create trigger trg_audit_machine_api_keys after insert or update or delete on machine_api_keys for each row execute function log_audit();
