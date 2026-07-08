import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  assetKindUsesCadastroLink,
  assetKindUsesInlineCadastro,
  emptyVerificationResponses,
  isLegacyResponses,
  LEGACY_ASSET_KEY,
  normalizeMultiAssetResponses,
  normalizeMultiAssetResponsible,
  normalizeVerificationResponses,
} from "./verificationChecklist";
import {
  loadAssetsByIds,
  loadInlineAssetsForVerification,
} from "./equipmentVerificationAssetsApi";

function assertSupabase() {
  if (!isSupabaseAuthMode) throw new Error("Supabase necessário para verificações RE-6.4.12B");
}

export async function listEquipmentVerifications(tenantId, { kind = "all", year = "all" } = {}) {
  assertSupabase();
  let q = supabase
    .from("equipment_verifications")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("year", { ascending: false });
  if (kind !== "all") q = q.eq("equipment_kind", kind);
  if (year !== "all") q = q.eq("year", Number(year));
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function loadVerificationAssets(tenantId, record) {
  const kind = record.equipment_kind;
  const linkedIds = record.linked_asset_ids || [];

  if (assetKindUsesInlineCadastro(kind)) {
    return loadInlineAssetsForVerification(tenantId, kind, record.id);
  }
  if (assetKindUsesCadastroLink(kind) && linkedIds.length) {
    return loadAssetsByIds(tenantId, kind, linkedIds);
  }
  return [];
}

export async function getEquipmentVerification(id, tenantId = null) {
  assertSupabase();
  const { data, error } = await supabase
    .from("equipment_verifications")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;

  const linkedIds = data.linked_asset_ids || [];
  let assets = [];
  if (tenantId) {
    assets = await loadVerificationAssets(tenantId, data);
  }

  const assetIds = assets.map((a) => a.id);
  const effectiveIds = assetIds.length ? assetIds : linkedIds;

  const responses = normalizeMultiAssetResponses(
    data.equipment_kind,
    data.responses,
    effectiveIds,
  );
  const responsible = normalizeMultiAssetResponsible(
    data.responsible_by_month || {},
    effectiveIds,
  );

  return {
    ...data,
    assets,
    responses,
    responsible_by_month: responsible,
  };
}

export async function createEquipmentVerification(tenantId, { equipmentKind, year }) {
  assertSupabase();
  const y = Number(year);
  if (!equipmentKind) throw new Error("Tipo de equipamento obrigatório");
  if (!Number.isFinite(y) || y < 2000) throw new Error("Ano inválido");
  const payload = {
    tenant_id: tenantId,
    equipment_kind: equipmentKind,
    year: y,
    responses: {},
    responsible_by_month: {},
    occurrences: "",
    issued_approved_by: "",
    issue_date: null,
    linked_asset_ids: [],
  };
  const { data, error } = await supabase
    .from("equipment_verifications")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    if (String(error.message || "").includes("unique") || error.code === "23505") {
      throw new Error("Já existe verificação deste tipo para o ano selecionado");
    }
    throw error;
  }
  return { ...data, assets: [], responses: {}, responsible_by_month: {} };
}

export async function updateEquipmentVerification(id, patch) {
  assertSupabase();
  const { data, error } = await supabase
    .from("equipment_verifications")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEquipmentVerification(id) {
  assertSupabase();
  const { error } = await supabase.from("equipment_verifications").delete().eq("id", id);
  if (error) throw error;
}

/** Prepara payload de gravação a partir do estado do editor. */
export function buildVerificationSavePayload({
  equipmentKind,
  responses = {},
  responsibleByMonth = {},
  linkedAssetIds = [],
  occurrences = "",
  issuedApprovedBy = "",
  issueDate = null,
}) {
  const ids = linkedAssetIds.filter((id) => id && id !== LEGACY_ASSET_KEY);
  const outResponses = {};
  const outResponsible = {};
  for (const assetId of ids) {
    if (responses[assetId]) outResponses[assetId] = responses[assetId];
    if (responsibleByMonth[assetId]) outResponsible[assetId] = responsibleByMonth[assetId];
  }
  if (!ids.length && responses[LEGACY_ASSET_KEY]) {
    return {
      linked_asset_ids: [],
      responses: normalizeVerificationResponses(equipmentKind, responses[LEGACY_ASSET_KEY]),
      responsible_by_month: responsibleByMonth[LEGACY_ASSET_KEY] || {},
      occurrences,
      issued_approved_by: issuedApprovedBy,
      issue_date: issueDate || null,
    };
  }
  return {
    linked_asset_ids: ids,
    responses: outResponses,
    responsible_by_month: outResponsible,
    occurrences,
    issued_approved_by: issuedApprovedBy,
    issue_date: issueDate || null,
  };
}

export { emptyVerificationResponses, isLegacyResponses, LEGACY_ASSET_KEY };
