// supabase/functions/create-api-key/index.ts
//
// Called from the app's Settings tab, by a signed-in Admin, to generate a
// new machine API key. Returns the plaintext key exactly once — only its
// SHA-256 hash is stored, so if this response is lost, the key is gone and
// a new one has to be generated (same as a password reset).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Verify the caller is a signed-in Admin — uses their own auth token, not the service role, for this check.
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: person } = await admin.from("personnel").select("id, access_role").eq("auth_user_id", user.id).single();
    if (!person || person.access_role !== "Admin") {
      return new Response(JSON.stringify({ error: "Only Admin can create API keys" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { label, qcMachineId, laboratoryId } = await req.json();
    if (!label) {
      return new Response(JSON.stringify({ error: "A label is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // laboratory_id is required on machine_api_keys (0025 migration). If this
    // key is restricted to a specific machine, that machine's own lab is the
    // more correct source of truth than whichever lab the admin happened to
    // have active — a key for a Hematology analyser should belong to
    // Hematology even if the admin created it while viewing Biochemistry.
    // Falls back to the admin's active lab only for an unrestricted key.
    let resolvedLabId = laboratoryId || null;
    if (qcMachineId) {
      const { data: machine } = await admin.from("qc_machines").select("laboratory_id").eq("id", qcMachineId).single();
      if (machine?.laboratory_id) resolvedLabId = machine.laboratory_id;
    }
    if (!resolvedLabId) {
      return new Response(JSON.stringify({ error: "Could not determine which laboratory this key belongs to — select a machine or an active laboratory first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const plainKey = "lqms_" + crypto.randomUUID().replace(/-/g, "");
    const keyHash = await sha256Hex(plainKey);
    const keyPrefix = plainKey.slice(0, 12);

    const { data: row, error } = await admin
      .from("machine_api_keys")
      .insert({ label, key_hash: keyHash, key_prefix: keyPrefix, qc_machine_id: qcMachineId || null, created_by: person.id, laboratory_id: resolvedLabId })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ id: row.id, plainKey, keyPrefix }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
