// supabase/functions/ingest-qc-result/index.ts
//
// The actual machine -> Lab QMS interface. Whatever sits on the machine
// side (the instrument's own network export, or gateway/middleware software
// bridging its native protocol) sends a POST request here.
//
// Unidirectional by design: this function only ever receives data and
// writes it in. Nothing is ever sent back to the machine beyond a plain
// success/failure response to the request itself.
//
// Deliberately does NOT auto-create machines, parameters, or controls if
// they don't already exist in Lab QMS — a typo or unexpected value fails
// loudly with a clear error, rather than silently creating malformed
// reference data. Every inserted run also stays unauthorized (authorized =
// false) until a person reviews and signs off on it in the app, exactly
// like a manually entered result — this interface does not bypass that
// safety check.
//
// Expected request:
//   POST /functions/v1/ingest-qc-result
//   Header: X-API-Key: lqms_xxxxxxxxxxxx
//   Body (JSON):
//   {
//     "machineName": "Ozelle EHBT-75",     // OR vendorInstrumentId below — at least one required
//     "vendorInstrumentId": "SN123456",     // the analyser's own ID, if that's what the interface engine sends instead of a friendly name
//     "parameter": "WBC",                   // OR vendorTestCode below — at least one required
//     "vendorTestCode": "GLU",              // the analyser's own test code — resolved via analyser_test_code_mappings (0042) for that machine's analyser_type
//     "level": "Level 1 (Low)",              // must be exactly one of the three level strings
//     "lotNumber": "LOT12345",               // must match an existing control's lot number for that parameter
//     "value": 5.4,
//     "date": "2026-08-14",                  // optional, defaults to today
//     "time": "14:32"                        // optional
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

  const { machineName, vendorInstrumentId, parameter, vendorTestCode, level, lotNumber, value, date, time } = body;
  if ((!machineName && !vendorInstrumentId) || (!parameter && !vendorTestCode) || !level || value === undefined || value === null) {
    return jsonError("(machineName or vendorInstrumentId), (parameter or vendorTestCode), level, and value are all required");
  }

  // If this key is restricted to one specific machine, enforce that here.
  // A machine can be identified either by its friendly name in this app,
  // or by the instrument's own ID/serial (vendor_instrument_id) — an
  // automated interface engine typically only knows the latter.
  let machineQuery = admin.from("qc_machines").select("id, name, laboratory_id, analyser_type");
  machineQuery = vendorInstrumentId ? machineQuery.eq("vendor_instrument_id", vendorInstrumentId) : machineQuery.ilike("name", machineName);
  const { data: machine } = await machineQuery.single();
  if (!machine) return jsonError(`No QC machine found matching "${machineName || vendorInstrumentId}"`, 404);
  if (keyRow.qc_machine_id && keyRow.qc_machine_id !== machine.id) {
    return jsonError("This API key is not authorized to submit results for that machine", 403);
  }

  // Resolve a vendor test code to this app's parameter name via the
  // per-analyser-type mapping table, if a code was sent instead of a name.
  let resolvedParameterName = parameter;
  if (!resolvedParameterName && vendorTestCode) {
    if (!machine.analyser_type) return jsonError(`Machine "${machine.name}" has no analyser_type set, so vendor test codes can't be resolved for it — set one in the app first.`, 400);
    const { data: mapping } = await admin.from("analyser_test_code_mappings").select("parameter_name")
      .eq("laboratory_id", machine.laboratory_id).eq("analyser_type", machine.analyser_type).eq("vendor_test_code", vendorTestCode).single();
    if (!mapping) return jsonError(`No test code mapping found for "${vendorTestCode}" on analyser type "${machine.analyser_type}" — add one from the IQC page first.`, 404);
    resolvedParameterName = mapping.parameter_name;
  }

  const { data: param } = await admin.from("qc_parameters").select("id").eq("machine_id", machine.id).ilike("name", resolvedParameterName).single();
  if (!param) return jsonError(`No parameter "${resolvedParameterName}" found for machine "${machine.name}"`, 404);

  let controlQuery = admin.from("qc_controls").select("id").eq("parameter_id", param.id).eq("level", level);
  if (lotNumber) controlQuery = controlQuery.eq("lot_number", lotNumber);
  const { data: controls } = await controlQuery;
  if (!controls || controls.length === 0) return jsonError(`No matching QC control found for parameter "${resolvedParameterName}", level "${level}"${lotNumber ? `, lot "${lotNumber}"` : ""}`, 404);
  if (controls.length > 1) return jsonError(`Multiple matching QC controls found — include lotNumber to disambiguate`, 400);

  const { data: run, error } = await admin
    .from("qc_runs")
    .insert({
      control_id: controls[0].id,
      date: date || new Date().toISOString().slice(0, 10),
      time: time || null,
      value,
      authorized: false,
      comment: `Received via machine interface (key: ${keyRow.label})`,
      laboratory_id: machine.laboratory_id,
    })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  await admin.from("machine_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);

  return new Response(JSON.stringify({ success: true, runId: run.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
