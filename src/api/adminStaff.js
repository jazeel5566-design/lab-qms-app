import { supabase } from "../supabaseClient.js";

/**
 * Admin-only staff creation WITH a login (name + password + access role).
 * Goes through the admin-create-staff Edge Function so the calling Admin's
 * own browser session is never disturbed (see that function's header comment
 * for why this can't just be a plain supabase.auth.signUp() call from here).
 */
export async function adminCreateStaff({ name, jobTitle, email, recordCardNumber, password, accessRole }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const { data, error } = await supabase.functions.invoke("admin-create-staff", {
    body: { name, jobTitle, email, recordCardNumber, password, accessRole },
  });
  if (error) throw new Error(error.message || "Failed to create staff account.");
  if (data?.error) throw new Error(data.error);
  return data.person;
}

/** Admin-only: set a new password for an EXISTING person (see admin-reset-password Edge Function). */
export async function adminResetPassword(personnelId, newPassword) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");

  const { data, error } = await supabase.functions.invoke("admin-reset-password", {
    body: { personnelId, newPassword },
  });
  if (error) throw new Error(error.message || "Failed to reset password.");
  if (data?.error) throw new Error(data.error);
  return data;
}
