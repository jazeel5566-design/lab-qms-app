import { supabase } from "../supabaseClient.js";

export async function listTasks() {
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/** Assigner-role-only server-side (RLS) — Admin, Deputy Admin, QA Manager, Deputy QA Manager. */
export async function createTask(task) {
  const { data, error } = await supabase.from("tasks").insert(task).select().single();
  if (error) throw new Error(error.message);
  return data;
}

/** Assigner-role-only server-side — for editing title/assignee/due date/priority/clause. */
export async function updateTask(id, patch) {
  const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Any non-Viewer can call this, even if they can't create/reassign tasks —
 * goes through the set_task_status() RPC (0004_rpc_functions.sql), which is
 * the only path allowed to change just the status column for non-assigners.
 */
export async function setTaskStatus(id, status) {
  const { error } = await supabase.rpc("set_task_status", { p_task_id: id, p_status: status });
  if (error) throw new Error(error.message);
}

/** Assigner-role-only server-side. */
export async function deleteTask(id) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
