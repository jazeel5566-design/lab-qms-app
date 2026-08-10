// supabase/functions/admin-reset-password/index.ts
//
// Companion to admin-create-staff: lets an Admin set a NEW password for an
// EXISTING person, using the service-role key server-side. Same reasoning
// as admin-create-staff — this can't be done safely from the browser, and
// supabase.auth.admin.* methods require the service-role key which must
// never be shipped to a client.
//
// Deploy with: supabase functions deploy admin-reset-password
//
// CORS: browsers require an explicit "yes, you may call this" response
// (a preflight OPTIONS request) before they'll allow a webpage to call this
// function at all. Every response below — including errors — must include
// the corsHeaders, or the browser blocks the request before your code even
// runs, surfacing as a generic "Failed to send a request to the Edge
// Function" with no further detail.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const callerJwt = authHeader.replace("Bearer ", "");
    if (!callerJwt) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(callerJwt);
    if (callerErr || !caller) {
      return json({ error: "Could not verify caller" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerPersonnel, error: personnelErr } = await admin
      .from("personnel")
      .select("access_role")
      .eq("auth_user_id", caller.id)
      .maybeSingle();
    if (personnelErr || !callerPersonnel || callerPersonnel.access_role !== "Admin") {
      return json({ error: "Only an Admin can reset another person's password." }, 403);
    }

    const { personnelId, newPassword } = await req.json();
    if (!personnelId || !newPassword || newPassword.length < 6) {
      return json({ error: "personnelId and a newPassword of at least 6 characters are required." }, 400);
    }

    const { data: targetPerson, error: targetErr } = await admin
      .from("personnel")
      .select("auth_user_id, name")
      .eq("id", personnelId)
      .maybeSingle();
    if (targetErr || !targetPerson || !targetPerson.auth_user_id) {
      return json({ error: "Could not find that person's login account." }, 404);
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(targetPerson.auth_user_id, { password: newPassword });
    if (updateErr) {
      return json({ error: updateErr.message }, 400);
    }

    return json({ ok: true, name: targetPerson.name }, 200);
  } catch (e) {
    return json({ error: e.message || "Unknown error" }, 500);
  }
});
