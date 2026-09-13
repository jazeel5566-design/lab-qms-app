import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && /^https?:\/\//.test(url));

if (!isSupabaseConfigured) {
  // Deliberately NOT throwing here. createClient() throws immediately on a
  // missing/invalid URL, and since this file is imported before React ever
  // mounts, that exception used to crash the whole app silently — a blank
  // white page with no on-screen explanation. main.jsx checks
  // isSupabaseConfigured and shows a real error message instead.
  console.error(
    "Supabase is not configured: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing or invalid.\n" +
    "Locally: copy .env.example to .env and fill in your project's values, then restart `npm run dev`.\n" +
    "On Vercel: Project Settings -> Environment Variables -> add both -> then Deployments -> Redeploy " +
    "(adding env vars does NOT rebuild an existing deployment automatically)."
  );
}

// A harmless placeholder URL when unconfigured, purely so createClient() doesn't
// throw during import — isSupabaseConfigured is what actually gates real usage.
export const supabase = createClient(
  isSupabaseConfigured ? url : "https://placeholder.supabase.co",
  isSupabaseConfigured ? anonKey : "placeholder-anon-key"
);

/**
 * supabase.functions.invoke() has a well-known gotcha: when the function
 * responds with a non-2xx status, the `error` it returns is a
 * FunctionsHttpError whose own .message is just the generic
 * "Edge Function returned a non-2xx status code" — the function's actual
 * { error: "..." } response body is NOT automatically read. That real
 * reason is still there, on error.context (the raw Response object), and
 * has to be read out explicitly. Wrap every edge function call's error
 * handling in this so the real reason reaches the person using the app
 * instead of a meaningless generic string.
 */
export async function functionErrorMessage(error) {
  if (!error) return "";
  try {
    if (error.context && typeof error.context.json === "function") {
      const body = await error.context.json();
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
  } catch {
    // context wasn't valid JSON — fall through to the generic message below.
  }
  return error.message || String(error);
}
