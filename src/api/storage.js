import { supabase } from "../supabaseClient.js";

const BUCKET = "documents";

/**
 * Uploads a file into the given folder ("controlled", "personal", or
 * "general" — matches the storage policies in 0009). Returns the storage
 * path to save on the documents row.
 */
export async function uploadDocumentFile(file, folder) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw new Error(error.message);
  return path;
}

/**
 * The bucket is private, so files are never reachable by a plain public URL —
 * a temporary signed link has to be generated on demand each time someone
 * wants to open one. Defaults to a 1-hour expiry.
 */
export async function getSignedDocumentUrl(path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds, { download: false });
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteDocumentFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

// ---------------- Personnel documents bucket (0047) ----------------
// Separate PRIVATE bucket from "documents" above, because that bucket's
// storage policy lets any authenticated user read any file in it — fine
// for SOPs, wrong for personal HR/qualification records. Path structure
// (<laboratoryId>/<personnelId>/<category-slug>/<timestamp>-<filename>)
// is what the storage RLS policies in 0047 key off of, so it must be kept
// exactly in this shape. No delete function exists here on purpose — the
// bucket has no delete storage policy, matching "no delete" in the UI.

const PERSONNEL_DOCS_BUCKET = "personnel-documents";

function slugifyCategory(category) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function uploadPersonnelDocumentFile(file, laboratoryId, personnelId, category) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${laboratoryId}/${personnelId}/${slugifyCategory(category)}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(PERSONNEL_DOCS_BUCKET).upload(path, file);
  if (error) throw new Error(error.message);
  return path;
}

export async function getSignedPersonnelDocumentUrl(path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage.from(PERSONNEL_DOCS_BUCKET).createSignedUrl(path, expiresInSeconds, { download: false });
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
