import { supabase } from "../supabaseClient.js";

// ---------------- EQA program catalog (0034) ----------------
// One row per (provider, program name, cycle) a lab is enrolled in — the
// structured alternative to free-typing "RIQAS" / "Clinical Chemistry
// program" / "24" every time a result is logged.

export async function listEqaPrograms(laboratoryId) {
  let q = supabase.from("eqa_programs").select("*").order("program_name");
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}
export async function createEqaProgram(program) {
  const { data, error } = await supabase.from("eqa_programs").insert(program).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function updateEqaProgram(id, patch) {
  const { data, error } = await supabase.from("eqa_programs").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteEqaProgram(id) {
  const { error } = await supabase.from("eqa_programs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------- Analytes tested under each program ----------------

export async function listProgramAnalytes(laboratoryId) {
  // Joins through eqa_programs so a single call can load every analyte for
  // every program in the active lab, rather than one round-trip per program.
  let q = supabase.from("eqa_program_analytes").select("*, eqa_programs!inner(laboratory_id)").order("sort_order");
  if (laboratoryId) q = q.eq("eqa_programs.laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}
export async function addProgramAnalyte(analyte) {
  const { data, error } = await supabase.from("eqa_program_analytes").insert(analyte).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteProgramAnalyte(id) {
  const { error } = await supabase.from("eqa_program_analytes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
