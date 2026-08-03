// supabase/functions/admin-reset-password/index.ts
//
// Companion to admin-create-staff: lets an Admin set a NEW password for an
// EXISTING person, using the service-role key server-side. Same reasoning
// as admin-create-staff — this can't be done safely from the browser, and
// supabase.auth.admin.* methods require the service-role key which must
// never be shipped to a client.
//
// Deploy with: supabase functions deploy admin-reset-password

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const callerJwt = authHeader.replace("Bearer ", "");
    if (!callerJwt) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
    }

    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(callerJwt);
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Could not verify caller" }), { status: 401 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerPersonnel, error: personnelErr } = await admin
      .from("personnel")
      .select("access_role")
      .eq("auth_user_id", caller.id)
      .maybeSingle();
    if (personnelErr || !callerPersonnel || callerPersonnel.access_role !== "Admin") {
      return new Response(JSON.stringify({ error: "Only an Admin can reset another person's password." }), { status: 403 });
    }

    const { personnelId, newPassword } = await req.json();
    if (!personnelId || !newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "personnelId and a newPassword of at least 6 characters are required." }), { status: 400 });
    }

    const { data: targetPerson, error: targetErr } = await admin
      .from("personnel")
      .select("auth_user_id, name")
      .eq("id", personnelId)
      .maybeSingle();
    if (targetErr || !targetPerson || !targetPerson.auth_user_id) {
      return new Response(JSON.stringify({ error: "Could not find that person's login account." }), { status: 404 });
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(targetPerson.auth_user_id, { password: newPassword });
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true, name: targetPerson.name }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), { status: 500 });
  }
});
