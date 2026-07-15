import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  INACTIVE_CERTIFICATE_STATUSES,
  formatCertificateNumber,
} from "./weightCertificateSchema";

function assertSupabaseWeightColeta() {
  if (!isSupabaseAuthMode) throw new Error("Coleta de pesos requer ligação Supabase.");
}

/** Extrai campos de listagem a partir do payload RE-5.4.2A. */
export function extractDisplayFieldsFromWeightPayload(payload = {}) {
  const cliente = payload?.cliente || {};
  const geral = payload?.geral || {};
  return {
    client_name: String(cliente.solicitante || "").trim(),
    responsible_name: String(cliente.responsavel || "").trim(),
    weight_tag: String(geral.identificacao || "").trim(),
    calibration_date: geral.data_calibracao || null,
    commercial_proposal_ref: String(geral.processo_numero || payload?.commercial_proposal_ref || "").trim(),
  };
}

async function findBlockingWeightCertificate(collectionId, linkedCertificateId) {
  const { data: byCollection } = await supabase
    .from("weight_calibration_certificates")
    .select("id, status, certificate_number, certificate_year")
    .eq("collection_id", collectionId);

  for (const c of byCollection || []) {
    if (!INACTIVE_CERTIFICATE_STATUSES.includes(c.status)) {
      return c;
    }
  }

  if (linkedCertificateId && !byCollection?.some((c) => c.id === linkedCertificateId)) {
    const { data: linked } = await supabase
      .from("weight_calibration_certificates")
      .select("id, status, certificate_number, certificate_year")
      .eq("id", linkedCertificateId)
      .maybeSingle();
    if (linked && !INACTIVE_CERTIFICATE_STATUSES.includes(linked.status)) {
      return linked;
    }
  }

  return null;
}

export async function listWeightColetas(tenantId, filters = {}) {
  assertSupabaseWeightColeta();
  let q = supabase
    .from("weight_calibration_collections")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (filters.workflow_status && filters.workflow_status !== "all") {
    q = q.eq("workflow_status", filters.workflow_status);
  }
  if (filters.search) {
    const term = `%${String(filters.search).trim()}%`;
    q = q.or(
      `client_name.ilike.${term},weight_tag.ilike.${term},responsible_name.ilike.${term},commercial_proposal_ref.ilike.${term}`,
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getWeightColeta(id) {
  assertSupabaseWeightColeta();
  const { data, error } = await supabase
    .from("weight_calibration_collections")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function saveWeightColeta(
  tenantId,
  id,
  {
    payload,
    client_name,
    responsible_name,
    weight_tag,
    calibration_date,
    workflow_status,
    commercial_proposal_ref,
    userId,
  } = {},
) {
  assertSupabaseWeightColeta();

  const extracted = extractDisplayFieldsFromWeightPayload(payload || {});
  const row = {
    tenant_id: tenantId,
    payload: payload || {},
    client_name: client_name != null ? String(client_name) : extracted.client_name,
    responsible_name: responsible_name != null ? String(responsible_name) : extracted.responsible_name,
    weight_tag: weight_tag != null ? String(weight_tag) : extracted.weight_tag,
    calibration_date: calibration_date !== undefined ? calibration_date : extracted.calibration_date,
    commercial_proposal_ref:
      commercial_proposal_ref != null
        ? String(commercial_proposal_ref)
        : extracted.commercial_proposal_ref,
    workflow_status: workflow_status || "rascunho",
    updated_by: userId || null,
  };

  if (id) {
    const { data, error } = await supabase
      .from("weight_calibration_collections")
      .update(row)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("weight_calibration_collections")
    .insert({
      ...row,
      created_by: userId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWeightColeta(tenantId, id) {
  assertSupabaseWeightColeta();

  const { data: coleta, error: loadErr } = await supabase
    .from("weight_calibration_collections")
    .select("id, tenant_id, client_name, certificate_id")
    .eq("id", id)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (!coleta) throw new Error("Coleta não encontrada.");
  if (coleta.tenant_id !== tenantId) throw new Error("Coleta não pertence a este ambiente.");

  const blocking = await findBlockingWeightCertificate(id, coleta.certificate_id);
  if (blocking) {
    const num = formatCertificateNumber(blocking.certificate_number, blocking.certificate_year);
    throw new Error(
      `Não é possível excluir: coleta vinculada ao certificado ativo nº ${num}. Cancele o certificado, marque-o como obsoleto e remova-o antes.`,
    );
  }

  const { error } = await supabase
    .from("weight_calibration_collections")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return { id };
}

export async function updateWeightColetaWorkflow(id, status) {
  assertSupabaseWeightColeta();
  const { data, error } = await supabase
    .from("weight_calibration_collections")
    .update({ workflow_status: status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
