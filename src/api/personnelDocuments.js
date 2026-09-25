import { supabase } from "../supabaseClient.js";

// ---------------- Personnel documents (0047) ----------------
// One row per uploaded file in a staff member's personnel file. RLS lets a
// person see only their own rows, while manager-tier roles (Admin, Deputy
// Admin, QA Manager, Deputy QA Manager) see everyone's in labs they have
// access to. There is deliberately no update/delete function here — the
// database itself has no UPDATE or DELETE policy on this table, so an
// uploaded document can never be edited or removed, only superseded by a
// new version row.

export async function listPersonnelDocuments(laboratoryId) {
  let q = supabase.from("personnel_documents").select("*").order("uploaded_at", { ascending: false });
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function createPersonnelDocument(row) {
  const { data, error } = await supabase.from("personnel_documents").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}
