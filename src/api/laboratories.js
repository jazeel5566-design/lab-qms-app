import { supabase } from "../supabaseClient.js";

export async function listLaboratories() {
  const { data, error } = await supabase.from("laboratories").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}
export async function createLaboratory(name) {
  const { data, error } = await supabase.from("laboratories").insert({ name }).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function listPersonnelLaboratories() {
  const { data, error } = await supabase.from("personnel_laboratories").select("*");
  if (error) throw new Error(error.message);
  return data;
}
export async function assignPersonnelToLab(personnelId, laboratoryId) {
  const { data, error } = await supabase.from("personnel_laboratories").insert({ personnel_id: personnelId, laboratory_id: laboratoryId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function unassignPersonnelFromLab(id) {
  const { error } = await supabase.from("personnel_laboratories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
