-- 0003_audit_log_trigger.sql
-- Replaces the original app's client-side diff-based audit logging with a
-- database trigger. The actor is looked up server-side from auth.uid() —
-- never from anything the client sends — so it cannot be spoofed.

create or replace function log_audit() returns trigger
language plpgsql security definer as $$
declare
  v_actor_id uuid;
  v_actor_name text;
  v_actor_role text;
  v_record_id uuid;
begin
  select id, name, access_role into v_actor_id, v_actor_name, v_actor_role
  from personnel where auth_user_id = auth.uid();

  v_record_id := coalesce(new.id, old.id);

  insert into audit_log (actor_id, actor_name, actor_role, entity, action, record_id, summary)
  values (
    v_actor_id,
    coalesce(v_actor_name, 'Unknown'),
    coalesce(v_actor_role, ''),
    TG_TABLE_NAME,
    TG_OP,
    v_record_id,
    TG_OP || ' on ' || TG_TABLE_NAME
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_audit_personnel after insert or update or delete on personnel for each row execute function log_audit();
create trigger trg_audit_clause_status after insert or update or delete on clause_status for each row execute function log_audit();
create trigger trg_audit_tasks after insert or update or delete on tasks for each row execute function log_audit();
create trigger trg_audit_ncs after insert or update or delete on nonconformities for each row execute function log_audit();
create trigger trg_audit_competency after insert or update or delete on competency_records for each row execute function log_audit();
create trigger trg_audit_equipment after insert or update or delete on equipment for each row execute function log_audit();
create trigger trg_audit_equipment_records after insert or update or delete on equipment_records for each row execute function log_audit();
create trigger trg_audit_qc_machines after insert or update or delete on qc_machines for each row execute function log_audit();
create trigger trg_audit_qc_parameters after insert or update or delete on qc_parameters for each row execute function log_audit();
create trigger trg_audit_qc_controls after insert or update or delete on qc_controls for each row execute function log_audit();
create trigger trg_audit_qc_runs after insert or update or delete on qc_runs for each row execute function log_audit();
create trigger trg_audit_eqa_events after insert or update or delete on eqa_events for each row execute function log_audit();
create trigger trg_audit_documents after insert or update or delete on documents for each row execute function log_audit();
-- audit_log itself is intentionally NOT audited (would be infinite / pointless).
