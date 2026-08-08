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

/**
 * Callable by any non-Viewer, not just task assigners — enforced server-side
 * via the create_next_recurrence RPC (0011 migration), which only ever
 * clones an existing recurring task's own fields. Returns the newly created
 * task row, or null if the completed task wasn't actually recurring.
 */
export async function createNextRecurrence(completedTaskId) {
  const { data, error } = await supabase.rpc("create_next_recurrence", { p_completed_task_id: completedTaskId });
  if (error) throw new Error(error.message);
  return data;
}

/** Assigner-role-only server-side. */
export async function deleteTask(id) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
