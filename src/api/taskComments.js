import { supabase } from "../supabaseClient.js";

export async function listTaskComments(laboratoryId) {
  let q = supabase.from("task_comments").select("*").order("created_at", { ascending: true });
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}
export async function addTaskComment(taskId, authorId, comment, laboratoryId) {
  const { data, error } = await supabase.from("task_comments").insert({ task_id: taskId, author_id: authorId, comment, laboratory_id: laboratoryId }).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteTaskComment(id) {
  const { error } = await supabase.from("task_comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
