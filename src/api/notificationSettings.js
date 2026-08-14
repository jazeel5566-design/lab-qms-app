import { supabase } from "../supabaseClient.js";

export async function listNotificationSettings() {
  const { data, error } = await supabase.from("notification_settings").select("*");
  if (error) throw new Error(error.message);
  return data;
}
export async function setNotificationEnabled(eventKey, enabled) {
  const { error } = await supabase.from("notification_settings").update({ enabled, updated_at: new Date().toISOString() }).eq("event_key", eventKey);
  if (error) throw new Error(error.message);
}
