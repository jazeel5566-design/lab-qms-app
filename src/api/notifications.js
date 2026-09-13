import { supabase, functionErrorMessage } from "../supabaseClient.js";

/**
 * Fires a notification email. Deliberately never throws — a failed or
 * missing notification should never block the actual task/NC/document
 * action it's attached to. Errors are logged to the console only.
 */
export async function sendNotificationEmail(to, subject, html) {
  if (!to) return; // no email on file for this person — skip silently
  try {
    const { error } = await supabase.functions.invoke("send-email", { body: { to, subject, html } });
    if (error) console.error("Notification email failed to send:", await functionErrorMessage(error));
  } catch (e) {
    console.error("Notification email failed to send:", e);
  }
}
