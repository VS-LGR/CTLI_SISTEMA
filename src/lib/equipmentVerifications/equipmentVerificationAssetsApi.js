import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { assetTableForKind } from "./verificationChecklist";

function assertSupabase() {
  if (!isSupabaseAuthMode) throw new Error("Supabase necessário para verificações RE-6.4.12B");
}

export async function listLinkableCadastroAssets(tenantId, kind) {
  assertSupabase();
  if (kind === "pesos") {
    const { data, error } = await supabase
      .from("standard_weight_items")
      .select("id, identification, nominal_value, unit, certificate_number, active")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("identification");
    if (error) throw error;
    return data || [];
  }
  if (kind === "thermo") {
    const { data, error } = await supabase
      .from("environment_sensor_certificates")
      .select("id, equipment_name, certificate_number, manufacturer, calibration_date")
      .eq("tenant_id", tenantId)
      .order("equipment_name");
    if (error) throw error;
    return data || [];
  }
  return [];
}

export async function loadAssetsByIds(tenantId, kind, ids = []) {
  assertSupabase();
  const list = (ids || []).filter(Boolean);
  if (!list.length) return [];
  const table = assetTableForKind(kind);
  if (!table) return [];
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("tenant_id", tenantId)
    .in("id", list);
  if (error) throw error;
  const byId = Object.fromEntries((data || []).map((r) => [r.id, r]));
  return list.map((id) => byId[id]).filter(Boolean);
}

export async function loadInlineAssetsForVerification(tenantId, kind, verificationId) {
  assertSupabase();
  if (kind === "computador") {
    const { data, error } = await supabase
      .from("equipment_computers")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("verification_id", verificationId)
      .order("identification");
    if (error) throw error;
    return data || [];
  }
  if (kind === "veiculo") {
    const { data, error } = await supabase
      .from("equipment_vehicles")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("verification_id", verificationId)
      .order("identification");
    if (error) throw error;
    return data || [];
  }
  return [];
}

export async function createComputerForVerification(tenantId, verificationId, fields) {
  assertSupabase();
  const payload = {
    tenant_id: tenantId,
    verification_id: verificationId,
    identification: String(fields.identification || "").trim(),
    brand: String(fields.brand || "").trim(),
    model: String(fields.model || "").trim(),
    operating_system: String(fields.operating_system || "").trim(),
    location: String(fields.location || "").trim(),
    responsible: String(fields.responsible || "").trim(),
    notes: String(fields.notes || "").trim(),
    active: fields.active !== false,
  };
  if (!payload.identification) throw new Error("Identificação / patrimônio obrigatório");
  const { data, error } = await supabase
    .from("equipment_computers")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function createVehicleForVerification(tenantId, verificationId, fields) {
  assertSupabase();
  const id = String(fields.identification || "").trim();
  const plate = String(fields.plate || "").trim();
  if (!id && !plate) throw new Error("Informe identificação ou placa");
  let yearVal = null;
  if (fields.year != null && String(fields.year).trim()) {
    yearVal = Number(fields.year);
    if (!Number.isFinite(yearVal)) throw new Error("Ano inválido");
  }
  const payload = {
    tenant_id: tenantId,
    verification_id: verificationId,
    identification: id || plate,
    plate,
    brand: String(fields.brand || "").trim(),
    model: String(fields.model || "").trim(),
    year: yearVal,
    usage_description: String(fields.usage_description || "").trim(),
    responsible: String(fields.responsible || "").trim(),
    documentation_notes: String(fields.documentation_notes || "").trim(),
    notes: String(fields.notes || "").trim(),
    active: fields.active !== false,
  };
  const { data, error } = await supabase
    .from("equipment_vehicles")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateComputerAsset(id, fields) {
  assertSupabase();
  const payload = {
    identification: String(fields.identification || "").trim(),
    brand: String(fields.brand || "").trim(),
    model: String(fields.model || "").trim(),
    operating_system: String(fields.operating_system || "").trim(),
    location: String(fields.location || "").trim(),
    responsible: String(fields.responsible || "").trim(),
    notes: String(fields.notes || "").trim(),
    active: fields.active !== false,
  };
  const { data, error } = await supabase
    .from("equipment_computers")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateVehicleAsset(id, fields) {
  assertSupabase();
  let yearVal = fields.year != null && String(fields.year).trim() ? Number(fields.year) : null;
  if (yearVal != null && !Number.isFinite(yearVal)) throw new Error("Ano inválido");
  const payload = {
    identification: String(fields.identification || "").trim(),
    plate: String(fields.plate || "").trim(),
    brand: String(fields.brand || "").trim(),
    model: String(fields.model || "").trim(),
    year: yearVal,
    usage_description: String(fields.usage_description || "").trim(),
    responsible: String(fields.responsible || "").trim(),
    documentation_notes: String(fields.documentation_notes || "").trim(),
    notes: String(fields.notes || "").trim(),
    active: fields.active !== false,
  };
  const { data, error } = await supabase
    .from("equipment_vehicles")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInlineAsset(kind, id) {
  assertSupabase();
  const table = assetTableForKind(kind);
  if (!table || (kind !== "computador" && kind !== "veiculo")) {
    throw new Error("Remoção inline só para computadores e veículos");
  }
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}
