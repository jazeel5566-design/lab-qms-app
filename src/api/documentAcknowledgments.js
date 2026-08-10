import { supabase } from "../supabaseClient.js";

export async function listAllAcknowledgments() {
  const { data, error } = await supabase.from("document_acknowledgments").select("*");
  if (error) throw new Error(error.message);
  return data;
}

/** A person can only ever acknowledge as themselves — enforced server-side too (0009 migration). */
export async function acknowledgeDocument(documentId, personnelId) {
  const { data, error } = await supabase
    .from("document_acknowledgments")
    .upsert({ document_id: documentId, personnel_id: personnelId }, { onConflict: "document_id,personnel_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
