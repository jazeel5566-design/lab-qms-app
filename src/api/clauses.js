import { supabase } from "../supabaseClient.js";

export async function listClauseStatus(laboratoryId) {
  let q = supabase.from("clause_status").select("*");
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  // Return as a map keyed by clause_id, same shape the app used originally.
  return Object.fromEntries(data.map(row => [row.clause_id, row]));
}

/** Upserts a single clause's status fields. clauseId is the business key, e.g. '5.7'. */
export async function upsertClauseStatus(clauseId, laboratoryId, patch) {
  const { data, error } = await supabase
    .from("clause_status")
    .upsert({ clause_id: clauseId, laboratory_id: laboratoryId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "clause_id,laboratory_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Every laboratory needs all 34 ISO 15189:2022 clauses seeded the moment
 * it's created — otherwise the FIRST time anyone tries to reference a clause
 * for that lab (evidence linking, task assignment, etc.) hits the exact same
 * foreign-key trap the original global clause_status table had before it
 * was seeded (see migration 0010). clauseIds is passed in from App.jsx's
 * own ALL_SUBCLAUSES list, so this never has its own separate, potentially
 * drifting copy of the 34 clause numbers.
 */
export async function seedClauseStatusForLab(laboratoryId, clauseIds) {
  const rows = clauseIds.map(clauseId => ({ clause_id: clauseId, laboratory_id: laboratoryId }));
  const { error } = await supabase.from("clause_status").upsert(rows, { onConflict: "clause_id,laboratory_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}
