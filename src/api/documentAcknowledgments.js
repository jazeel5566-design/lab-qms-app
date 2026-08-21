import { supabase } from "../supabaseClient.js";

export async function listAllAcknowledgments(laboratoryId) {
  let q = supabase.from("document_acknowledgments").select("*");
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

/** A person can only ever acknowledge as themselves — enforced server-side too (0009 migration). */
export async function acknowledgeDocument(documentId, personnelId, laboratoryId) {
  const { data, error } = await supabase
    .from("document_acknowledgments")
    .upsert({ document_id: documentId, personnel_id: personnelId, laboratory_id: laboratoryId }, { onConflict: "document_id,personnel_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
