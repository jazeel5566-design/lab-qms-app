import { supabase } from "../supabaseClient.js";

// ---------------- Analyser test code mappings (0042) ----------------
// One row per (analyser type, vendor test code) -> this app's parameter
// name. Lets an HL7/ASTM interface engine (e.g. Mirth Connect) send an
// instrument's own raw test code, with ingest-qc-result resolving it to
// the right qc_parameters row via this table instead of requiring the
// bridge itself to know this app's naming.

export async function listTestCodeMappings(laboratoryId) {
  let q = supabase.from("analyser_test_code_mappings").select("*").order("analyser_type").order("vendor_test_code");
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}
export async function createTestCodeMapping(mapping) {
  const { data, error } = await supabase.from("analyser_test_code_mappings").insert(mapping).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteTestCodeMapping(id) {
  const { error } = await supabase.from("analyser_test_code_mappings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
