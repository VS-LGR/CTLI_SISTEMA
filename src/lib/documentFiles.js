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
  return null;
}

export { downloadOriginalFile };
