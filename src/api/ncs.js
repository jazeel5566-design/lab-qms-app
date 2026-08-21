import { supabase } from "../supabaseClient.js";

export async function listNonconformities(laboratoryId) {
  let q = supabase.from("nonconformities").select("*").order("created_at", { ascending: false });
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function createNonconformity(nc) {
  const { data, error } = await supabase.from("nonconformities").insert(nc).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateNonconformity(id, patch) {
  const { data, error } = await supabase.from("nonconformities").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteNonconformity(id) {
  const { error } = await supabase.from("nonconformities").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Simple sequential NC number, e.g. NC-004. Computed client-side from the current list. */
export function nextNcNumber(existingList) {
  return `NC-${String(existingList.length + 1).padStart(3, "0")}`;
}
