import { supabase } from "../supabaseClient.js";

export async function listTaskTemplates(laboratoryId) {
  let q = supabase.from("task_templates").select("*").order("title", { ascending: true });
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}
export async function createTaskTemplate(row) {
  const { data, error } = await supabase.from("task_templates").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteTaskTemplate(id) {
  const { error } = await supabase.from("task_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
