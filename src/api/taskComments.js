import { supabase } from "../supabaseClient.js";

export async function listTaskComments() {
  const { data, error } = await supabase.from("task_comments").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}
export async function addTaskComment(taskId, authorId, comment) {
  const { data, error } = await supabase.from("task_comments").insert({ task_id: taskId, author_id: authorId, comment }).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteTaskComment(id) {
  const { error } = await supabase.from("task_comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
