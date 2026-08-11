import { supabase } from "../supabaseClient.js";

export async function listEquipmentDowntime() {
  const { data, error } = await supabase.from("equipment_downtime").select("*").order("started_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
export async function reportDowntime(row) {
  const { data, error } = await supabase.from("equipment_downtime").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function resolveDowntime(id, resolutionNotes) {
  const { data, error } = await supabase
    .from("equipment_downtime")
    .update({ resolved_at: new Date().toISOString(), resolution_notes: resolutionNotes || null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteDowntime(id) {
  const { error } = await supabase.from("equipment_downtime").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
