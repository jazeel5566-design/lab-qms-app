import { supabase } from "../supabaseClient.js";

// ---------------- Staff competency (Clause 6.1) ----------------
export async function listCompetency() {
  const { data, error } = await supabase.from("competency_records").select("*, personnel(name)").order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
export async function createCompetency(record) {
  const { data, error } = await supabase.from("competency_records").insert(record).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function updateCompetency(id, patch) {
  const { data, error } = await supabase.from("competency_records").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteCompetency(id) {
  const { error } = await supabase.from("competency_records").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
/** Restricted server-side (0015 migration) to the person the record is actually about — not just left to the UI to enforce. */
export async function confirmCompetencyAssessment(recordId) {
  const { data, error } = await supabase.rpc("confirm_competency_assessment", { p_record_id: recordId });
  if (error) throw new Error(error.message);
  return data;
}

// ---------------- Equipment inventory (Clauses 6.3/6.4) ----------------
export async function listEquipment() {
  const { data, error } = await supabase.from("equipment").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}
export async function createEquipment(item) {
  const { data, error } = await supabase.from("equipment").insert(item).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function updateEquipment(id, patch) {
  const { data, error } = await supabase.from("equipment").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteEquipment(id) {
  const { error } = await supabase.from("equipment").delete().eq("id", id); // cascades to equipment_records
  if (error) throw new Error(error.message);
}

// ---------------- Equipment IQ/OQ/PQ/calibration/maintenance records ----------------
export async function listEquipmentRecords(equipmentId) {
  let query = supabase.from("equipment_records").select("*").order("date", { ascending: false });
  if (equipmentId) query = query.eq("equipment_id", equipmentId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
export async function createEquipmentRecord(record) {
  const { data, error } = await supabase.from("equipment_records").insert(record).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteEquipmentRecord(id) {
  const { error } = await supabase.from("equipment_records").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
