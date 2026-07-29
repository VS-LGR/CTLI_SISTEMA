import { envEquipmentTypeLabel } from "@/lib/cadastroConstants";
import { parseCalibrationNumber } from "@/lib/certificateCalculations/parseNumber";
import { isLoadBatchItem } from "@/lib/standardWeightItemUtils";
import {
  classifyWeightClassFromUncertainty,
  toGrams,
  fromGrams,
} from "@/lib/weightCalibrationCalculations/oimlTables";

/** @typedef {'APROVADO'|'REPROVADO'|'VENCIDO'|'INATIVO'|'A_VERIFICAR'} SheetStatus */

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

/**
 * Metrologia de peso padrão conforme RE-6.4B (colunas ocultas + Classe).
 * - Classifica pela Ue vs. incerteza tolerada (δm/3), E1→M3
 * - EP = δm; U máx = δm/3
 * - V.C. min/max = nominal ± (EP − Ue)
 */
export function computeWeightSheetMetrology({
  nominalRaw,
  conventionalRaw,
  uncertaintyRaw,
  unit = "g",
} = {}) {
  const nom = parseCalibrationNumber(nominalRaw);
  const vc = parseCalibrationNumber(conventionalRaw);
  const ue = parseCalibrationNumber(uncertaintyRaw);
  const unitNorm = String(unit || "g").toLowerCase();

  if (!nom.valid || !ue.valid) {
    return {
      className: null,
      error: null,
      errorFound: NA,
      maxError: NA,
      maxUncertainty: NA,
      vcMin: NA,
      vcMax: NA,
      withinTolerance: null,
    };
  }

  const nominalG = toGrams(nom.value, unitNorm);
  const classified = classifyWeightClassFromUncertainty(nominalG, ue.value, unitNorm);
  const { error, errorFound } = computeMassError(nominalRaw, conventionalRaw);

  if (!classified.className || classified.mpeMg == null) {
    return {
      className: null,
      error,
      errorFound,
      maxError: NA,
      maxUncertainty: NA,
      vcMin: NA,
      vcMax: NA,
      withinTolerance: null,
    };
  }

  const epInUnit = fromGrams(classified.mpeMg / 1000, unitNorm);
  const uMaxInUnit = fromGrams(classified.classUncertaintyMg / 1000, unitNorm);
  const vcMin = nom.value - (epInUnit - ue.value);
  const vcMax = nom.value + (epInUnit - ue.value);
  const withinTolerance = vc.valid
    ? vc.value >= vcMin && vc.value <= vcMax
    : null;

  return {
    className: classified.className,
    error,
    errorFound,
    maxError: formatDisplayNumber(epInUnit, 8),
    maxUncertainty: formatDisplayNumber(uMaxInUnit, 8),
    vcMin: formatDisplayNumber(vcMin, 8),
    vcMax: formatDisplayNumber(vcMax, 8),
    withinTolerance,
    epInUnit,
    uMaxInUnit,
    ue: ue.value,
    nominal: nom.value,
  };
}

function calibrationFrequencyLabel(calib, expiry) {
  if (!calib || !expiry) return NA;
  return "02 anos";
}

function frequencyStatusLabel(freq, calendarStatus) {
  if (freq === NA) return calendarStatus || NA;
  if (calendarStatus === "VENCIDO") return `${freq} - Vencido`;
  if (calendarStatus === "INATIVO") return `${freq} - Inativo`;
  if (calendarStatus === "APROVADO") return `${freq} - Ok`;
  return `${freq} - A verificar`;
}

function historyLabel(weightStatus) {
  if (!weightStatus) return NA;
  const n = String(weightStatus).replace(/[^\d]/g, "");
  if (!n) return NA;
  return `${n}ª Calibração`;
}

function addYearsIso(isoDate, years) {
  if (!isoDate) return null;
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
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

function deriveWeightSituation({ active, expiryDate, today, withinTolerance }) {
  if (active === false) return "INATIVO";
  const calendar = deriveDeviceSheetStatus({ active, expiryDate, today });
  if (calendar === "VENCIDO") return "VENCIDO";
  if (withinTolerance === true && calendar === "APROVADO") return "APROVADO";
  if (withinTolerance === false) return "REPROVADO";
  if (withinTolerance == null && calendar === "APROVADO") return "A_VERIFICAR";
  return calendar;
}

function mapWeightItem(item, certById, today) {
  const cert = item.weight_certificate_id
    ? certById[item.weight_certificate_id]
    : null;
  const expiry = cert?.expiry_date || null;
  const calib = cert?.calibration_date || null;
  const calendarStatus = deriveDeviceSheetStatus({ active: item.active, expiryDate: expiry, today });
  const freq = calibrationFrequencyLabel(calib, expiry);
  const metro = computeWeightSheetMetrology({
    nominalRaw: item.nominal_value,
    conventionalRaw: item.conventional_value,
    uncertaintyRaw: item.expanded_uncertainty,
    unit: item.unit || "g",
  });
  const classLabel = metro.className
    || item.weight_class
    || cert?.class
    || NA;
  const status = deriveWeightSituation({
    active: item.active,
    expiryDate: expiry,
    today,
    withinTolerance: metro.withinTolerance,
  });

  const intermediateFromCert = cert?.intermediate_check_label || null;
  const intermediateDate = addYearsIso(calib, 1);

  return baseRow({
    source: "peso",
    sourceId: item.id,
    identification: item.identification || "",
    equipmentType: "Peso Padrão",
    manufacturer: cert?.manufacturer || NA,
    location: item.location || cert?.location || NA,
    certificateNumber: item.certificate_number || cert?.certificate_number || "",
    calibratedBy: cert?.calibrated_by || "",
    calibrationDate: calib,
    nextCalibrationDate: expiry,
    intermediateCheck: intermediateFromCert || intermediateDate || NA,
    calibrationFrequency: freq,
    frequencyStatus: frequencyStatusLabel(freq, calendarStatus),
    nominalValue: item.nominal_value || NA,
    conventionalValue: item.conventional_value || NA,
    errorFound: metro.errorFound,
    maxError: metro.maxError,
    uncertainty: item.expanded_uncertainty || NA,
    maxUncertainty: metro.maxUncertainty,
    unit: item.unit || "g",
    equipmentClass: classLabel,
    quantity: "MASSA",
    vcMin: metro.vcMin,
    vcMax: metro.vcMax,
    status,
    history: historyLabel(item.weight_status),
    updatedAt: item.updated_at || cert?.updated_at || null,
  });
}

function mapEnvCert(cert, quantityMeta, today) {
  const status = deriveDeviceSheetStatus({ active: true, expiryDate: cert.expiry_date, today });
  const freq = calibrationFrequencyLabel(cert.calibration_date, cert.expiry_date);
  const intermediateFromCert = cert.intermediate_check_label || null;
  const intermediateDate = addYearsIso(cert.calibration_date, 1);
  return baseRow({
    source: "thermo",
    sourceId: `${cert.id}-${quantityMeta.key}`,
    identification: cert.equipment_name || "",
    equipmentType: envEquipmentTypeLabel(cert.equipment_type),
    manufacturer: cert.manufacturer || NA,
    location: cert.location || NA,
    certificateNumber: cert.certificate_number || "",
    calibratedBy: cert.calibrated_by || "",
    calibrationDate: cert.calibration_date || null,
    nextCalibrationDate: cert.expiry_date || null,
    intermediateCheck: intermediateFromCert || intermediateDate || NA,
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
      r.equipmentClass,
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
