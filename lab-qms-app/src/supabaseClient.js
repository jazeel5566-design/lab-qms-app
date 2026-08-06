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
