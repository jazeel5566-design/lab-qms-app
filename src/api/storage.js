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
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteDocumentFile(path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
