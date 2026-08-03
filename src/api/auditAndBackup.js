import { supabase } from "../supabaseClient.js";
import * as XLSX from "xlsx";

/** Read-only; RLS restricts this to Admin/QA Manager regardless of what the client requests. */
export async function listAuditLog({ entity, actorName, limit = 500 } = {}) {
  let q = supabase.from("audit_log").select("*").order("ts", { ascending: false }).limit(limit);
  if (entity) q = q.eq("entity", entity);
  if (actorName) q = q.eq("actor_name", actorName);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Full-system export, same idea as the original app's "Download full backup"
 * button — one workbook, one sheet per table. RLS means a Viewer or
 * Technologist calling this simply gets empty/partial sheets for anything
 * they can't SELECT (e.g. audit_log) rather than an error, since RLS filters
 * rows rather than blocking the query.
 */
export async function downloadFullBackup() {
  const tables = [
    "personnel", "clause_status", "tasks", "nonconformities", "competency_records",
    "equipment", "equipment_records", "qc_machines", "qc_parameters", "qc_controls",
    "qc_runs", "eqa_events", "documents", "audit_log",
  ];

  const wb = XLSX.utils.book_new();
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = data && data.length ? data : [{ note: "no data" }];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31));
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `lab-qms-backup-${stamp}.xlsx`);
}
