import { supabase } from "./supabaseClient.js";

// Supabase Auth wants an email. The app's login is "username = record card
// number", so we map each record card number to a synthetic, never-emailed
// address under a reserved-looking domain. Password hashing, session tokens,
// and credential storage are all handled by Supabase Auth from here on —
// nothing password-related is stored in the personnel table.
const cardToEmail = (recordCardNumber) =>
  `${recordCardNumber.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-")}@lab.local`;

/**
 * Log in with record card number + password.
 * Returns { personnel, session } on success, throws on failure.
 */
export async function signIn(recordCardNumber, password) {
  const email = cardToEmail(recordCardNumber);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Incorrect record card number or password.");

  const personnel = await getCurrentPersonnel();
  if (!personnel) throw new Error("Signed in, but no personnel record is linked to this account. Ask an Admin to check the Personnel page.");
  return { personnel, session: data.session };
}

/**
 * Self-registration ("I'm new here" flow). Always creates a Technologist-level
 * account — matches the RLS policy in 0002, which only allows a self-inserted
 * personnel row at that access level. An Admin can raise it afterward.
 */
export async function signUpNew({ recordCardNumber, name, jobTitle, password }) {
  const email = cardToEmail(recordCardNumber);
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);

  const authUserId = data.user?.id;
  if (!authUserId) throw new Error("Sign-up succeeded but no user id was returned — check if email confirmation is required in your Supabase Auth settings and disable it for this internal-tool use case.");

  const { data: person, error: insertError } = await supabase
    .from("personnel")
    .insert({
      auth_user_id: authUserId,
      name,
      job_title: jobTitle || null,
      record_card_number: recordCardNumber.trim(),
      access_role: "Technologist",
    })
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);
  return person;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentPersonnel() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("personnel")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Call once on app load to restore an existing session, if any. */
export async function restoreSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return getCurrentPersonnel();
}
