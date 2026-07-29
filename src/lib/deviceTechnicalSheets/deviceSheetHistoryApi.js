import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";

const TRACKED_WEIGHT_FIELDS = [
  { key: "identification", label: "Identificação" },
  { key: "nominal_value", label: "Valor nominal" },
  { key: "conventional_value", label: "Valor convencional" },
  { key: "expanded_uncertainty", label: "Incerteza (Ue)" },
  { key: "unit", label: "Unidade" },
  { key: "weight_class", label: "Classe" },
  { key: "certificate_number", label: "Nº certificado" },
  { key: "weight_certificate_id", label: "Certificado vinculado" },
  { key: "weight_status", label: "Status calibração" },
  { key: "active", label: "Ativo" },
];

const TRACKED_THERMO_FIELDS = [
  { key: "equipment_name", label: "Identificação" },
  { key: "manufacturer", label: "Fabricante" },
  { key: "certificate_number", label: "Nº certificado" },
  { key: "calibrated_by", label: "Laboratório" },
  { key: "calibration_date", label: "Data calibração" },
  { key: "expiry_date", label: "Próxima calibração" },
  { key: "intermediate_check_label", label: "Checagem intermediária" },
];

function norm(v) {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export async function listDeviceTechnicalSheetHistory(tenantId, { limit = 200 } = {}) {
  if (!tenantId || !isSupabaseAuthMode) return [];
  const { data, error } = await supabase
    .from("device_technical_sheet_history")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function recordDeviceSheetFieldChanges({
  tenantId,
  source,
  sourceId,
  identification = "",
  certificateNumber = "",
  before = null,
  after = null,
  fields = [],
}) {
  if (!tenantId || !sourceId || !after || !isSupabaseAuthMode) return;
  const tracked = fields.length
    ? fields
    : (source === "thermo" ? TRACKED_THERMO_FIELDS : TRACKED_WEIGHT_FIELDS);

  const rows = [];
  for (const f of tracked) {
    const oldV = before ? norm(before[f.key]) : "";
    const newV = norm(after[f.key]);
    if (oldV === newV) continue;
    rows.push({
      tenant_id: tenantId,
      source,
      source_id: sourceId,
      identification: identification || norm(after.identification || after.equipment_name),
      field_key: f.key,
      field_label: f.label,
      old_value: oldV,
      new_value: newV,
      certificate_number_snapshot: certificateNumber || norm(after.certificate_number),
    });
  }
  if (!rows.length) return;
  const { error } = await supabase.from("device_technical_sheet_history").insert(rows);
  if (error) throw error;
}

export async function recordWeightItemSheetHistory(tenantId, before, after) {
  if (!after?.id) return;
  if (after.is_load_batch) return;
  await recordDeviceSheetFieldChanges({
    tenantId,
    source: "peso",
    sourceId: after.id,
    identification: after.identification || "",
    certificateNumber: after.certificate_number || "",
    before,
    after,
    fields: TRACKED_WEIGHT_FIELDS,
  });
}

export async function recordThermoCertSheetHistory(tenantId, before, after) {
  if (!after?.id) return;
  await recordDeviceSheetFieldChanges({
    tenantId,
    source: "thermo",
    sourceId: after.id,
    identification: after.equipment_name || "",
    certificateNumber: after.certificate_number || "",
    before,
    after,
    fields: TRACKED_THERMO_FIELDS,
  });
}
