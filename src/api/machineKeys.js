import { supabase } from "../supabaseClient.js";

export async function listMachineApiKeys() {
  const { data, error } = await supabase.from("machine_api_keys").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/** Calls the create-api-key Edge Function — returns { id, plainKey, keyPrefix }. plainKey is shown exactly once and never recoverable afterward. */
export async function createMachineApiKey(label, qcMachineId) {
  const { data, error } = await supabase.functions.invoke("create-api-key", { body: { label, qcMachineId: qcMachineId || null } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function revokeMachineApiKey(id) {
  const { error } = await supabase.from("machine_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}
