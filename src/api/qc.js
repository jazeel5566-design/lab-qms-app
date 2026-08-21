import { supabase } from "../supabaseClient.js";

// ============================================================================
// Westgard rule evaluation — copied verbatim from the original app (lab-qms.jsx)
// so the math is guaranteed identical to what was already validated against
// IQC-Westgard-Validation-Protocol.docx. Deliberately computed here at
// query-time, not stored in the database (see 0001_init_schema.sql note on
// qc_runs) — this guarantees flags are always derived from current data.
// ============================================================================
export const REJECT_RULES = ["1_3s", "2_2s", "R_4s", "4_1s", "10x"];
export const RULE_LABEL = {
  "1_2s": "1₂s (warning)", "1_3s": "1₃s", "2_2s": "2₂s", "R_4s": "R₄s", "4_1s": "4₁s", "10x": "10x",
};
export const zScore = (value, mean, sd) => (!sd ? 0 : (value - mean) / sd);

export function evaluateControlSeries(runsAsc) {
  return runsAsc.map((r, i) => {
    const z = zScore(r.value, r.mean, r.sd);
    const v = [];
    if (Math.abs(z) > 3) v.push("1_3s");
    else if (Math.abs(z) > 2) v.push("1_2s");
    if (i >= 1) {
      const z0 = zScore(runsAsc[i - 1].value, runsAsc[i - 1].mean, runsAsc[i - 1].sd);
      if (Math.abs(z) > 2 && Math.abs(z0) > 2 && Math.sign(z) === Math.sign(z0)) v.push("2_2s");
    }
    if (i >= 3) {
      const last4 = runsAsc.slice(i - 3, i + 1).map(x => zScore(x.value, x.mean, x.sd));
      if (last4.every(zz => Math.abs(zz) > 1) && last4.every(zz => Math.sign(zz) === Math.sign(last4[0])) && last4[0] !== 0) v.push("4_1s");
    }
    if (i >= 9) {
      const last10 = runsAsc.slice(i - 9, i + 1).map(x => zScore(x.value, x.mean, x.sd));
      if (last10.every(zz => zz > 0) || last10.every(zz => zz < 0)) v.push("10x");
    }
    return { ...r, z, violations: v };
  });
}

export function applyR4s(runsWithZ, allControlsRunsForParam) {
  const byDate = {};
  allControlsRunsForParam.forEach(r => { (byDate[r.date] = byDate[r.date] || []).push(r); });
  const flagged = new Set();
  Object.values(byDate).forEach(group => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (Math.abs(group[i].z - group[j].z) >= 4 && Math.sign(group[i].z) !== Math.sign(group[j].z)) {
          flagged.add(group[i].id); flagged.add(group[j].id);
        }
      }
    }
  });
  return runsWithZ.map(r => flagged.has(r.id) ? { ...r, violations: [...r.violations, "R_4s"] } : r);
}

// ============================================================================
// Machines / parameters / controls (master data, canEdit-gated via RLS)
// ============================================================================
export async function listMachines(laboratoryId) {
  let q = supabase.from("qc_machines").select("*").order("name");
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}
export async function createMachine(machine) {
  const { data, error } = await supabase.from("qc_machines").insert(machine).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function updateMachine(id, patch) {
  const { data, error } = await supabase.from("qc_machines").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteMachine(id) {
  const { error } = await supabase.from("qc_machines").delete().eq("id", id); // cascades parameters/controls/runs
  if (error) throw new Error(error.message);
}

export async function listParameters(machineId, laboratoryId) {
  let q = supabase.from("qc_parameters").select("*");
  if (machineId) q = q.eq("machine_id", machineId);
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}
export async function createParameter(param) {
  const { data, error } = await supabase.from("qc_parameters").insert(param).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteParameter(id) {
  const { error } = await supabase.from("qc_parameters").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listControls(parameterId, laboratoryId) {
  let q = supabase.from("qc_controls").select("*");
  if (parameterId) q = q.eq("parameter_id", parameterId);
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}
export async function createControl(control) {
  const { data, error } = await supabase.from("qc_controls").insert(control).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteControl(id) {
  const { error } = await supabase.from("qc_controls").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// Runs (IQC results)
// ============================================================================
export async function listRuns(controlIds, laboratoryId) {
  let q = supabase.from("qc_runs").select("*").order("date", { ascending: true });
  if (controlIds?.length) q = q.in("control_id", controlIds);
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

/** Blocked server-side for Viewers (RLS); also blocked once authorized=true. */
export async function logRun(run) {
  const { data, error } = await supabase.from("qc_runs").insert({ ...run, authorized: false }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

/** Bulk insert for CSV import — one round trip for many rows instead of one call per row. */
export async function logRunsBulk(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase.from("qc_runs").insert(rows.map(r => ({ ...r, authorized: false }))).select();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteRun(id) {
  const { error } = await supabase.from("qc_runs").delete().eq("id", id); // fails if already authorized (RLS)
  if (error) throw new Error(error.message);
}

/**
 * The ONLY way authorized/authorized_by/authorized_at can ever be set.
 * Enforced server-side by the authorize_qc_run() RPC (0004): rejects unless
 * the CALLER's own session role is Admin or QA Manager, and stamps the
 * caller's own personnel id — never anything the client supplies.
 */
export async function authorizeRun(runId) {
  const { error } = await supabase.rpc("authorize_qc_run", { p_run_id: runId });
  if (error) throw new Error(error.message);
}

/**
 * Fetch + evaluate a full parameter's IQC picture in one call: all controls,
 * all runs per control (with z-scores and Westgard violations), and R-4s
 * cross-level flags applied across all of them for the same date.
 */
export async function getParameterWithEvaluatedRuns(parameterId) {
  const controls = await listControls(parameterId);
  const controlIds = controls.map(c => c.id);
  const allRuns = controlIds.length ? await listRuns(controlIds) : [];

  const runsByControl = {};
  controls.forEach(ctrl => {
    const runsAsc = allRuns
      .filter(r => r.control_id === ctrl.id)
      .map(r => ({ ...r, mean: ctrl.mean, sd: ctrl.sd }))
      .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
    runsByControl[ctrl.id] = evaluateControlSeries(runsAsc);
  });

  const flatEvaluated = Object.values(runsByControl).flat();
  const withR4s = applyR4s(flatEvaluated, flatEvaluated);
  const withR4sById = Object.fromEntries(withR4s.map(r => [r.id, r]));

  return {
    controls,
    runsByControl: Object.fromEntries(
      Object.entries(runsByControl).map(([controlId, runs]) => [controlId, runs.map(r => withR4sById[r.id] || r)])
    ),
  };
}
