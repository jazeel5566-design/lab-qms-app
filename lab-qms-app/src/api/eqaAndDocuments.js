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

// ---------------- Documents (linked SOPs/certificates/personal docs) ----------------
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
export async function updateDocument(id, patch) {
  const { data, error } = await supabase.from("documents").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteDocument(id) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Publishes a new version of a controlled document (SOP/QSP/Policy/Manual).
 * If an existing current version shares this document_code, it is marked
 * is_current = false first, and the new row's version number is one higher
 * than the highest existing version for that code — so everyone browsing
 * the register sees the new version automatically, while the old one is
 * retained (not deleted) for traceability.
 * RLS (0007_document_control.sql) independently enforces that only
 * Admin/QA Manager/Deputy QA Manager can actually perform either write.
 */
export async function publishControlledDocument(doc) {
  let nextVersion = 1;
  if (doc.document_code) {
    const { data: existing, error: findErr } = await supabase
      .from("documents")
      .select("id, version")
      .eq("document_code", doc.document_code)
      .order("version", { ascending: false });
    if (findErr) throw new Error(findErr.message);
    if (existing && existing.length) {
      nextVersion = Math.max(...existing.map(r => r.version)) + 1;
      const currentIds = existing.map(r => r.id);
      const { error: supersedeErr } = await supabase.from("documents").update({ is_current: false }).in("id", currentIds);
      if (supersedeErr) throw new Error(supersedeErr.message);
    }
  }
  const { data, error } = await supabase
    .from("documents")
    .insert({ ...doc, version: nextVersion, is_current: true })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
