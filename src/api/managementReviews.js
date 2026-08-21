import { supabase } from "../supabaseClient.js";

export async function listManagementReviews(laboratoryId) {
  let q = supabase.from("management_reviews").select("*").order("review_date", { ascending: false });
  if (laboratoryId) q = q.eq("laboratory_id", laboratoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}
export async function createManagementReview(review) {
  const { data, error } = await supabase.from("management_reviews").insert(review).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteManagementReview(id) {
  const { error } = await supabase.from("management_reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
