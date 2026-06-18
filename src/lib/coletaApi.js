import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { INACTIVE_CERTIFICATE_STATUSES, formatCertificateNumber } from "@/lib/calibrationCertificates/certificateSchema";

function assertSupabaseColeta() {
  if (!isSupabaseAuthMode) throw new Error("Coleta requer ligação Supabase.");
}

async function findBlockingCertificateForColeta(collectionId, linkedCertificateId) {
  const { data: byCollection } = await supabase
    .from("calibration_certificates")
    .select("id, status, certificate_number, certificate_year")
    .eq("collection_id", collectionId);

  for (const c of byCollection || []) {
    if (!INACTIVE_CERTIFICATE_STATUSES.includes(c.status)) {
      return c;
    }
  }

  if (linkedCertificateId && !byCollection?.some((c) => c.id === linkedCertificateId)) {
    const { data: linked } = await supabase
      .from("calibration_certificates")
      .select("id, status, certificate_number, certificate_year")
      .eq("id", linkedCertificateId)
      .maybeSingle();
    if (linked && !INACTIVE_CERTIFICATE_STATUSES.includes(linked.status)) {
      return linked;
    }
  }

  return null;
}

export async function deleteColeta(tenantId, collectionId) {
  assertSupabaseColeta();

  const { data: coleta, error: loadErr } = await supabase
    .from("scale_calibration_collections")
    .select("id, tenant_id, client_name, certificate_id")
    .eq("id", collectionId)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (!coleta) throw new Error("Coleta não encontrada.");
  if (coleta.tenant_id !== tenantId) throw new Error("Coleta não pertence a este ambiente.");

  const blocking = await findBlockingCertificateForColeta(collectionId, coleta.certificate_id);
  if (blocking) {
    const num = formatCertificateNumber(blocking.certificate_number, blocking.certificate_year);
    throw new Error(
      `Não é possível excluir: coleta vinculada ao certificado ativo nº ${num}. Cancele o certificado, marque-o como obsoleto e remova-o antes.`,
    );
  }

  const { error } = await supabase
    .from("scale_calibration_collections")
    .delete()
    .eq("id", collectionId);
  if (error) throw error;
  return { id: collectionId };
}
