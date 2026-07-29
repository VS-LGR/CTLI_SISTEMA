import { envEquipmentTypeLabel } from "@/lib/cadastroConstants";
import { parseCalibrationNumber } from "@/lib/certificateCalculations/parseNumber";
import { isLoadBatchItem } from "@/lib/standardWeightItemUtils";

/** @typedef {'APROVADO'|'VENCIDO'|'INATIVO'|'A_VERIFICAR'} SheetStatus */

const NA = "N/A";

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

function formatDisplayNumber(value, digits = 6) {
  if (value == null || Number.isNaN(value)) return NA;
  const s = Number(value).toFixed(digits).replace(/\.?0+$/, "").replace(".", ",");
  return s || "0";
}

/** Erro = V.C. − nominal (unidade do cadastro). */
export function computeMassError(nominalRaw, conventionalRaw) {
  const nom = parseCalibrationNumber(nominalRaw);
  const vc = parseCalibrationNumber(conventionalRaw);
  if (!nom.valid || !vc.valid) {
    return { error: null, errorFound: NA, display: NA };
  }
  const error = vc.value - nom.value;
  return {
    error,
    errorFound: formatDisplayNumber(error, 8),
    display: formatDisplayNumber(error, 8),
  };
}

function calibrationFrequencyLabel(calib, expiry) {
  if (!calib || !expiry) return NA;
  return "02 anos";
}

function frequencyStatusLabel(freq, status) {
  if (freq === NA) return status || NA;
  const statusShort = status === "APROVADO" ? "Ok"
    : status === "VENCIDO" ? "Vencido"
      : status === "INATIVO" ? "Inativo"
        : "A verificar";
  return `${freq} — ${statusShort}`;
}

function historyLabel(weightStatus) {
  if (!weightStatus) return NA;
  const n = String(weightStatus).replace(/[^\d]/g, "");
  if (!n) return NA;
  return `${n}ª Calibração`;
}

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
    frequencyStatus: NA,
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
    maintenancePlan: "RE-6.4.12A",
    history: NA,
    updatedAt: null,
    ...partial,
  };
}

function mapWeightItem(item, certById, today) {
  const cert = item.weight_certificate_id
    ? certById[item.weight_certificate_id]
    : null;
  const expiry = cert?.expiry_date || null;
  const calib = cert?.calibration_date || null;
  const status = deriveDeviceSheetStatus({ active: item.active, expiryDate: expiry, today });
  const freq = calibrationFrequencyLabel(calib, expiry);
  const { errorFound } = computeMassError(item.nominal_value, item.conventional_value);
  const classLabel = item.weight_class || cert?.class || NA;

  return baseRow({
    source: "peso",
    sourceId: item.id,
    identification: item.identification || "",
    equipmentType: "Peso Padrão",
    manufacturer: cert?.manufacturer || NA,
    location: NA,
    certificateNumber: item.certificate_number || cert?.certificate_number || "",
    calibratedBy: cert?.calibrated_by || "",
    calibrationDate: calib,
    nextCalibrationDate: expiry,
    intermediateCheck: cert?.intermediate_check_label || NA,
    calibrationFrequency: freq,
    frequencyStatus: frequencyStatusLabel(freq, status),
    nominalValue: item.nominal_value || NA,
    conventionalValue: item.conventional_value || NA,
    errorFound,
    uncertainty: item.expanded_uncertainty || NA,
    unit: item.unit || "g",
    equipmentClass: classLabel,
    quantity: "MASSA",
    status,
    history: historyLabel(item.weight_status),
    updatedAt: item.updated_at || cert?.updated_at || null,
  });
}

function mapEnvCert(cert, quantityMeta, today) {
  const status = deriveDeviceSheetStatus({ active: true, expiryDate: cert.expiry_date, today });
  const freq = calibrationFrequencyLabel(cert.calibration_date, cert.expiry_date);
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
    calibrationFrequency: freq,
    frequencyStatus: frequencyStatusLabel(freq, status),
    unit: quantityMeta.unit,
    quantity: quantityMeta.label,
    status,
    history: "1ª Calibração",
    updatedAt: cert.updated_at || null,
  });
}

/**
 * Agrega pesos (sem lote de carga) e termo-baro numa lista unificada tipo RE-6.4B.
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
    if (isLoadBatchItem(item)) continue;
    rows.push(mapWeightItem(item, certById, today));
  }

  for (const cert of envCertificates || []) {
    for (const q of thermQuantities(cert.equipment_type)) {
      rows.push(mapEnvCert(cert, q, today));
    }
  }

  return rows;
}

export function latestSheetUpdateIso(rows = []) {
  let max = null;
  for (const r of rows || []) {
    const iso = r.updatedAt ? String(r.updatedAt) : null;
    if (iso && (!max || iso > max)) max = iso;
  }
  return max;
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
      r.history,
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function uniqueSheetValues(rows, key) {
  return [...new Set((rows || []).map((r) => r[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), "pt"),
  );
}
