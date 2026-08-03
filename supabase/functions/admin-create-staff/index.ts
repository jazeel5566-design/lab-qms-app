// supabase/functions/admin-create-staff/index.ts
//
// WHY THIS EXISTS: the browser's Supabase client can only manage ONE session
// at a time. If an Admin called supabase.auth.signUp() directly from the app
// to create someone else's account, it would REPLACE the Admin's own session
// with the new person's — logging the Admin out of their own account. This
// Edge Function does the account creation server-side, using the service-role
// key, so the Admin's browser session is never touched.
//
// Deploy with: supabase functions deploy admin-create-staff
// Requires the project's SUPABASE_SERVICE_ROLE_KEY to be set as a secret
// (Supabase sets SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY automatically for
// Edge Functions — no manual secret needed for those two).

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

    // Client bound to the CALLER's JWT — used only to find out who's calling.
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser(callerJwt);
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Could not verify caller" }), { status: 401 });
    }

    // Service-role client — bypasses RLS, only used for privileged operations below.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: callerPersonnel, error: personnelErr } = await admin
      .from("personnel")
      .select("access_role")
      .eq("auth_user_id", caller.id)
      .maybeSingle();
    if (personnelErr || !callerPersonnel || callerPersonnel.access_role !== "Admin") {
      return new Response(JSON.stringify({ error: "Only an Admin can create new staff accounts." }), { status: 403 });
    }

    const body = await req.json();
    const { name, jobTitle, email, recordCardNumber, password, accessRole } = body;
    if (!name || !recordCardNumber || !password || !accessRole) {
      return new Response(JSON.stringify({ error: "name, recordCardNumber, password, and accessRole are required" }), { status: 400 });
    }

    const validRoles = ["Admin", "Deputy Admin", "QA Manager", "Deputy QA Manager", "Technologist", "Viewer"];
    if (!validRoles.includes(accessRole)) {
      return new Response(JSON.stringify({ error: `accessRole must be one of: ${validRoles.join(", ")}` }), { status: 400 });
    }

    const syntheticEmail = `${recordCardNumber.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-")}@lab.local`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true, // no real inbox exists for @lab.local — mark confirmed immediately
    });
    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), { status: 400 });
    }

    const { data: person, error: insertErr } = await admin
      .from("personnel")
      .insert({
        auth_user_id: created.user.id,
        name,
        job_title: jobTitle || null,
        email: email || null,
        record_card_number: recordCardNumber.trim(),
        access_role: accessRole,
      })
      .select()
      .single();

    if (insertErr) {
      // Roll back the auth user so we don't leave an orphaned login with no personnel row.
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ person }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), { status: 500 });
  }
});
