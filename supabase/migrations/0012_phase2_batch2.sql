-- 0012_phase2_batch2.sql
-- Equipment downtime/service ticket tracking. The other four items in this
-- batch (clause change history, review cadence alerts, advanced audit
-- search, printable IQC report) all read from data that already exists —
-- no schema changes needed for those.

create table equipment_downtime (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  reason text not null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text,
  reported_by uuid references personnel(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_equipment_downtime_equipment on equipment_downtime(equipment_id);

alter table equipment_downtime enable row level security;
create policy equipment_downtime_select on equipment_downtime for select using (auth.role() = 'authenticated');
create policy equipment_downtime_insert on equipment_downtime for insert with check (can_edit());
create policy equipment_downtime_update on equipment_downtime for update using (can_edit()) with check (can_edit());
create policy equipment_downtime_delete on equipment_downtime for delete using (can_edit());
create trigger trg_audit_equipment_downtime after insert or update or delete on equipment_downtime for each row execute function log_audit();

-- Keeps equipment.status in sync automatically, regardless of which client
-- action created or resolved the downtime record — reporting downtime always
-- marks the equipment Out of service, and resolving it always marks the
-- equipment back In service (unless it was Decommissioned, which is left alone).
create or replace function sync_equipment_status_from_downtime() returns trigger
language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' and NEW.resolved_at is null then
    update equipment set status = 'Out of service' where id = NEW.equipment_id and status <> 'Decommissioned';
  elsif TG_OP = 'UPDATE' and NEW.resolved_at is not null and OLD.resolved_at is null then
    update equipment set status = 'In service' where id = NEW.equipment_id and status = 'Out of service';
  end if;
  return NEW;
end;
$$;
create trigger trg_sync_equipment_status after insert or update on equipment_downtime for each row execute function sync_equipment_status_from_downtime();
