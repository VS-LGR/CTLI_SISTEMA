import { envEquipmentTypeLabel } from "@/lib/cadastroConstants";

/** @typedef {'APROVADO'|'VENCIDO'|'INATIVO'|'A_VERIFICAR'} SheetStatus */

export function todayIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * @returns {SheetStatus}
 */
export function deriveDeviceSheetStatus({ active = true, expiryDate = null, today = todayIsoDate() } = {}) {
  if (active === false) return "INATIVO";
  if (!expiryDate) return "A_VERIFICAR";
  const exp = String(expiryDate).slice(0, 10);
  if (exp < today) return "VENCIDO";
  return "APROVADO";
}

const NA = "N/A";

function thermQuantities(equipmentType) {
  switch (equipmentType) {
    case "barometro":
      return [{ key: "pressao", label: "PRESSÃO", unit: "hPa" }];
    case "termo_higrometro":
      return [
        { key: "temp", label: "TEMP.", unit: "°C" },
        { key: "umidade", label: "UMIDADE", unit: "%" },
      ];
    default:
      return [
        { key: "pressao", label: "PRESSÃO", unit: "hPa" },
        { key: "temp", label: "TEMP.", unit: "°C" },
        { key: "umidade", label: "UMIDADE", unit: "%" },
      ];
  }
}

function baseRow(partial) {
  return {
    source: "",
    sourceId: "",
    identification: "",
    equipmentType: "",
    manufacturer: "",
    location: NA,
    certificateNumber: "",
    calibratedBy: "",
    calibrationDate: null,
    nextCalibrationDate: null,
    intermediateCheck: NA,
    calibrationFrequency: NA,
    nominalValue: NA,
    conventionalValue: NA,
    errorFound: NA,
    maxError: NA,
    uncertainty: NA,
    maxUncertainty: NA,
    unit: "",
    equipmentClass: NA,
    quantity: "",
    vcMin: NA,
    vcMax: NA,
    status: "A_VERIFICAR",
    maintenancePlan: NA,
    history: NA,
    ...partial,
  };
}

function mapWeightItem(item, certById, today) {
  const cert = item.weight_certificate_id
    ? certById[item.weight_certificate_id]
    : null;
  const expiry = cert?.expiry_date || null;
  const calib = cert?.calibration_date || null;
  return baseRow({
    source: "peso",
    sourceId: item.id,
    identification: item.identification || "",
    equipmentType: item.is_load_batch ? "Lote de carga" : "Peso Padrão",
    manufacturer: cert?.manufacturer || NA,
    location: NA,
    certificateNumber: item.certificate_number || cert?.certificate_number || "",
    calibratedBy: cert?.calibrated_by || "",
    calibrationDate: calib,
    nextCalibrationDate: expiry,
    intermediateCheck: cert?.intermediate_check_label || NA,
    calibrationFrequency: calib && expiry ? "02 anos" : NA,
    nominalValue: item.nominal_value || NA,
    conventionalValue: item.conventional_value || NA,
    uncertainty: item.expanded_uncertainty || NA,
    unit: item.unit || "g",
    equipmentClass: cert?.class || NA,
    quantity: "MASSA",
    status: deriveDeviceSheetStatus({ active: item.active, expiryDate: expiry, today }),
    history: item.weight_status ? `${item.weight_status}ª Calibração` : NA,
  });
}

function mapEnvCert(cert, quantityMeta, today) {
  return baseRow({
    source: "thermo",
    sourceId: `${cert.id}-${quantityMeta.key}`,
    identification: cert.equipment_name || "",
    equipmentType: envEquipmentTypeLabel(cert.equipment_type),
    manufacturer: cert.manufacturer || NA,
    location: NA,
    certificateNumber: cert.certificate_number || "",
    calibratedBy: cert.calibrated_by || "",
    calibrationDate: cert.calibration_date || null,
    nextCalibrationDate: cert.expiry_date || null,
    intermediateCheck: cert.intermediate_check_label || NA,
    calibrationFrequency: cert.calibration_date && cert.expiry_date ? "02 anos" : NA,
    unit: quantityMeta.unit,
    quantity: quantityMeta.label,
    status: deriveDeviceSheetStatus({ active: true, expiryDate: cert.expiry_date, today }),
    history: "1ª Calibração",
  });
}

/**
 * Agrega pesos e termo-baro numa lista unificada tipo RE-6.4B.
 */
export function buildDeviceTechnicalSheets({
  weightItems = [],
  weightCertificates = [],
  envCertificates = [],
  today = todayIsoDate(),
} = {}) {
  const certById = Object.fromEntries((weightCertificates || []).map((c) => [c.id, c]));
  const rows = [];

  for (const item of weightItems || []) {
    rows.push(mapWeightItem(item, certById, today));
  }

  for (const cert of envCertificates || []) {
    for (const q of thermQuantities(cert.equipment_type)) {
      rows.push(mapEnvCert(cert, q, today));
    }
  }

  return rows;
}

export function filterDeviceTechnicalSheets(rows, {
  query = "",
  equipmentType = "all",
  quantity = "all",
  status = "all",
  year = "all",
} = {}) {
  const q = query.trim().toLowerCase();
  return (rows || []).filter((r) => {
    if (equipmentType !== "all" && r.equipmentType !== equipmentType) return false;
    if (quantity !== "all" && r.quantity !== quantity) return false;
    if (status !== "all" && r.status !== status) return false;
    if (year !== "all") {
      const y = String(r.calibrationDate || "").slice(0, 4);
      if (y !== year) return false;
    }
    if (!q) return true;
    const hay = [
      r.identification,
      r.equipmentType,
      r.manufacturer,
      r.certificateNumber,
      r.location,
      r.quantity,
      r.status,
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function uniqueSheetValues(rows, key) {
  return [...new Set((rows || []).map((r) => r[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "pt"),
  );
}
