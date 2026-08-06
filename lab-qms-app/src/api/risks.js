import { supabase } from "../supabaseClient.js";

export async function listRisks() {
  const { data, error } = await supabase.from("risks").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
export async function createRisk(risk) {
  const { data, error } = await supabase.from("risks").insert(risk).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function updateRisk(id, patch) {
  const { data, error } = await supabase.from("risks").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteRisk(id) {
  const { error } = await supabase.from("risks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
