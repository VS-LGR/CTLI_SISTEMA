import { downloadOriginalFile, isSupabaseDocumentsEnabled, TENANT_DOCUMENTS_BUCKET } from "@/lib/documentsApi";
import { supabase } from "@/lib/supabaseClient";

export async function signedUrlForDoc(doc) {
  if (!doc?.storage_path) return null;
  if (isSupabaseDocumentsEnabled() && supabase) {
    const { data, error } = await supabase.storage
      .from(TENANT_DOCUMENTS_BUCKET)
      .createSignedUrl(doc.storage_path, 3600);
    if (error) throw error;
  return data?.signedUrl || null;
}

export async function openStoredFile(fileUrl) {
  if (!fileUrl) throw new Error("Sem arquivo");
  if (/^https?:\/\//i.test(fileUrl)) {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const url = await signedUrlForDoc({ storage_path: fileUrl });
  if (!url) throw new Error("Sem arquivo");
  window.open(url, "_blank", "noopener,noreferrer");
}
  return null;
}

export { downloadOriginalFile };
