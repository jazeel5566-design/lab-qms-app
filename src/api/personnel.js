import { supabase } from "../supabaseClient.js";

export async function listPersonnel() {
  const { data, error } = await supabase.from("personnel").select("*").order("name");
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Admin-only (enforced by RLS in 0002 — this call fails server-side for
 * anyone else, regardless of what the client sends).
 * NOTE: creating a NEW login (with a password) must go through
 * src/auth.js signUpNew() so Supabase Auth issues real credentials.
 * This function is for editing an EXISTING person's non-credential fields
 * (name, job title, email, access role, record card number).
 */
export async function updatePersonnel(id, patch) {
  const { data, error } = await supabase.from("personnel").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePersonnel(id) {
  const { error } = await supabase.from("personnel").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Self-service: updates ONLY the caller's own email, via the update_my_email() RPC (0031 migration) — never touches access_role, laboratory_id, or record_card_number, so it carries no privilege-escalation risk. */
export async function updateMyEmail(newEmail) {
  const { error } = await supabase.rpc("update_my_email", { new_email: newEmail });
  if (error) throw new Error(error.message);
}

/** Self-service: changes the CALLER's OWN password via Supabase Auth directly — no personnel table involved, no admin privileges needed. */
export async function updateMyPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
