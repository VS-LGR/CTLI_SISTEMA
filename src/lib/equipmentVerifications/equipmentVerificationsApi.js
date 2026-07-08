import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  emptyVerificationResponses,
  normalizeVerificationResponses,
} from "./verificationChecklist";

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

export async function getEquipmentVerification(id) {
  assertSupabase();
  const { data, error } = await supabase
    .from("equipment_verifications")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return {
    ...data,
    responses: normalizeVerificationResponses(data.equipment_kind, data.responses),
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
    responses: emptyVerificationResponses(equipmentKind),
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
  return data;
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
