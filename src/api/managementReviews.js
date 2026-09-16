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

// ---------------- management_review_items (0046) ----------------
// No laboratory_id of their own — RLS scopes them through their parent
// review, so a plain select (no explicit filter needed) already only
// returns items belonging to reviews this user can see.
export async function listManagementReviewItems() {
  const { data, error } = await supabase.from("management_review_items").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return data;
}
export async function createManagementReviewItem(item) {
  const { data, error } = await supabase.from("management_review_items").insert(item).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteManagementReviewItem(id) {
  const { error } = await supabase.from("management_review_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
