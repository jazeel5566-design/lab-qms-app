import { supabase } from "../supabaseClient.js";

export async function listClauseStatus() {
  const { data, error } = await supabase.from("clause_status").select("*");
  if (error) throw new Error(error.message);
  // Return as a map keyed by clause_id, same shape the app used originally.
  return Object.fromEntries(data.map(row => [row.clause_id, row]));
}

/** Upserts a single clause's status fields. clauseId is the business key, e.g. '5.7'. */
export async function upsertClauseStatus(clauseId, patch) {
  const { data, error } = await supabase
    .from("clause_status")
    .upsert({ clause_id: clauseId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "clause_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
