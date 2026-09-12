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

/**
 * Sequential NC number, e.g. NC-004 — generated server-side via the
 * generate_nc_number() function (0037 migration), SECURITY DEFINER so it
 * always counts every NC in the lab, not just the ones the calling user
 * can currently see. Client-side counting broke once regular staff were
 * restricted to seeing only their own NCs (their local count is no
 * longer the true total, and would start colliding on the same number).
 */
export async function generateNcNumber(laboratoryId) {
  const { data, error } = await supabase.rpc("generate_nc_number", { p_laboratory_id: laboratoryId });
  if (error) throw new Error(error.message);
  return data;
}
