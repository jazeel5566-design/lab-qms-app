import { supabase } from "../supabaseClient.js";

export async function listClauseEvidence() {
  const { data, error } = await supabase.from("clause_evidence").select("*");
  if (error) throw new Error(error.message);
  return data;
}
export async function addClauseEvidence(clauseId, documentId, addedBy, laboratoryId) {
  const { data, error } = await supabase
    .from("clause_evidence")
    .insert({ clause_id: clauseId, document_id: documentId, added_by: addedBy, laboratory_id: laboratoryId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
export async function removeClauseEvidence(id) {
  const { error } = await supabase.from("clause_evidence").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
