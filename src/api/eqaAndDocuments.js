import { supabase } from "../supabaseClient.js";

// ---------------- EQAS ----------------
// sdi and evaluation are NOT computed client-side or sent by the client for
// sdi — it's a Postgres GENERATED column (0001_init_schema.sql). evaluation
// is still set by the client/app logic since it can be manually overridden
// after the fact (matches original app behavior).
export async function listEqaEvents() {
  const { data, error } = await supabase.from("eqa_events").select("*").order("date_received", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
export async function createEqaEvent(event) {
  const { data, error } = await supabase.from("eqa_events").insert(event).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function updateEqaEvent(id, patch) {
  const { data, error } = await supabase.from("eqa_events").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteEqaEvent(id) {
  const { error } = await supabase.from("eqa_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------- Documents (linked SOPs/certificates) ----------------
export async function listDocuments() {
  const { data, error } = await supabase.from("documents").select("*").order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
export async function createDocument(doc) {
  const { data, error } = await supabase.from("documents").insert(doc).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteDocument(id) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
