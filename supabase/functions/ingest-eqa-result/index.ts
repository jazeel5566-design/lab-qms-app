// supabase/functions/ingest-eqa-result/index.ts
//
// Same idea as ingest-qc-result, for EQAS/proficiency testing instead of
// IQC. Manufacturer-agnostic — any analyser or middleware that can send a
// POST with this JSON shape can use it, nothing specific to any one brand.
//
// EQA peer-group statistics (mean/SD) come from the external PT provider,
// not the analyser itself, so they're optional here: if provided, SDI and
// evaluation are computed immediately, same as the manual entry form. If
// not, the result is stored with evaluation "Not yet received" for someone
// to complete once the provider's report arrives.
//
// Expected request:
//   POST /functions/v1/ingest-eqa-result
//   Header: X-API-Key: lqms_xxxxxxxxxxxx
//   Body (JSON):
//   {
//     "discipline": "Hematology" | "Biochemistry" | "Immunochemistry",
//     "machineName": "optional — must match an existing QC machine's name if given",
//     "parameter": "e.g. Hemoglobin",
//     "provider": "optional, e.g. RIQAS",
//     "cycle": "optional, e.g. 2026 Round 4",
//     "labResult": 12.4,
//     "peerMean": 12.6,        // optional
//     "peerSD": 0.5,           // optional
//     "dateReceived": "optional, defaults to today"
//   }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("Only POST is supported", 405);

  const apiKey = req.headers.get("X-API-Key");
  if (!apiKey) return jsonError("Missing X-API-Key header", 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const keyHash = await sha256Hex(apiKey);
  const { data: keyRow } = await admin.from("machine_api_keys").select("*").eq("key_hash", keyHash).is("revoked_at", null).single();
  if (!keyRow) return jsonError("Invalid or revoked API key", 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON");
  }

  const { discipline, machineName, parameter, provider, cycle, labResult, peerMean, peerSD, dateReceived } = body;
  if (!discipline || !parameter || labResult === undefined || labResult === null) {
    return jsonError("discipline, parameter, and labResult are all required");
  }
  if (!["Hematology", "Biochemistry", "Immunochemistry"].includes(discipline)) {
    return jsonError('discipline must be exactly "Hematology", "Biochemistry", or "Immunochemistry"');
  }

  let machineId: string | null = null;
  let laboratoryId: string | null = keyRow.laboratory_id ?? null;
  if (machineName) {
    const { data: machine } = await admin.from("qc_machines").select("id, laboratory_id").ilike("name", machineName).single();
    if (!machine) return jsonError(`No QC machine found matching "${machineName}"`, 404);
    machineId = machine.id;
    if (machine.laboratory_id) laboratoryId = machine.laboratory_id; // the specific machine's lab takes precedence over the key's own
    if (keyRow.qc_machine_id && keyRow.qc_machine_id !== machineId) {
      return jsonError("This API key is not authorized to submit results for that machine", 403);
    }
  }
  if (!laboratoryId) {
    return jsonError("Could not determine which laboratory this result belongs to — this API key has no laboratory assigned and no machineName was given.", 400);
  }

  const hasPeerStats = peerMean !== undefined && peerMean !== null && peerSD !== undefined && peerSD !== null && Number(peerSD) !== 0;
  const sdi = hasPeerStats ? (Number(labResult) - Number(peerMean)) / Number(peerSD) : null;
  const evaluation = sdi === null ? "Not yet received" : Math.abs(sdi) <= 2 ? "Satisfactory" : Math.abs(sdi) <= 3 ? "Marginal" : "Unsatisfactory";

  const { data: row, error } = await admin
    .from("eqa_events")
    .insert({
      discipline,
      machine_id: machineId,
      parameter,
      provider: provider || null,
      cycle: cycle || null,
      date_received: dateReceived || new Date().toISOString().slice(0, 10),
      lab_result: labResult,
      peer_mean: hasPeerStats ? peerMean : null,
      peer_sd: hasPeerStats ? peerSD : null,
      // sdi is NOT set here — it's a generated column the database computes
      // automatically from lab_result/peer_mean/peer_sd. Postgres rejects
      // any attempt to write to it directly, even with the correct value.
      evaluation,
      notes: `Received via machine interface (key: ${keyRow.label})`,
      laboratory_id: laboratoryId,
    })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  await admin.from("machine_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

  return new Response(JSON.stringify({ success: true, eventId: row.id, evaluation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
