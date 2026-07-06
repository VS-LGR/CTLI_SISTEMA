import { envEquipmentTypeLabel } from "@/lib/cadastroConstants";
import { fmtDmyShort } from "@/lib/dateFormat";
import {
  getEnabledQuantities,
  normalizeTbhCorrectionCalibration,
  previewRegressionForRange,
  TBH_QUANTITIES,
} from "@/lib/tbhCorrection/tbhCorrectionCalculations";

function formatRangeBounds(range, unit) {
  const min = range.min?.trim();
  const max = range.max?.trim();
  if (min && max) return `${min} a ${max} ${unit}`;
  if (min) return `≥ ${min} ${unit}`;
  if (max) return `≤ ${max} ${unit}`;
  return "—";
}

export function buildTbhCorrectionPdfViewModel(envCert, tenantName = "") {
  const calibration = normalizeTbhCorrectionCalibration(envCert?.tbh_correction_calibration);
  const equipmentType = envCert?.equipment_type || "thermo_baro_higrometro";
  const quantities = getEnabledQuantities(equipmentType);

  const sections = quantities.map((q) => {
    const ranges = (calibration[q.key]?.ranges || []).map((range) => {
      const regression = previewRegressionForRange(range);
      return {
        label: range.label || "Faixa",
        bounds: formatRangeBounds(range, q.unit),
        points: (range.points || []).map((p) => ({
          device: p.device ?? "",
          supplier: p.supplier ?? "",
        })),
        regression: regression
          ? {
              slope: regression.slope,
              intercept: regression.intercept,
              pointCount: regression.pointCount,
            }
          : null,
      };
    });
    return {
      key: q.key,
      label: q.label,
      unit: q.unit,
      ranges,
    };
  });

  return {
    tenantName,
    equipment: {
      name: envCert?.equipment_name || "—",
      type: envEquipmentTypeLabel(equipmentType),
      manufacturer: envCert?.manufacturer || "—",
      model: envCert?.model || "—",
      certificateNumber: envCert?.certificate_number || "—",
      calibrationDate: fmtDmyShort(envCert?.calibration_date),
      calibratedBy: envCert?.calibrated_by || "—",
    },
    sections,
    documentCode: "RE-6.4E",
    documentTitle: "Planilha de Correção TBH",
    documentRef: "PR-6.4",
  };
}

/** ViewModel RE-6.4D — leituras corrigidas de uma sessão (coleta/certificado). */
export function buildTbhSessionCorrectionPdfViewModel({ byEquipment = [], tenantName = "" }) {
  const blocks = (byEquipment || []).map((block) => ({
    equipmentName: block.equipment_name || block.label || "—",
    rows: Object.entries(block.phases || {}).flatMap(([phase, quantities]) =>
      Object.entries(quantities || {}).map(([qKey, res]) => {
        if (!res?.valid) return null;
        const meta = TBH_QUANTITIES[qKey];
        return {
          quantity: meta?.label || qKey,
          phase: phase === "initial" ? "Inicial" : "Final",
          device: res.device?.toString().replace(".", ",") ?? "—",
          corrected: res.correctedDisplay || "—",
          delta: res.delta != null ? res.delta.toFixed(1).replace(".", ",") : "—",
          rangeLabel: res.range_label || "—",
        };
      }).filter(Boolean),
    ),
  }));

  return {
    tenantName,
    blocks,
    documentCode: "RE-6.4D",
    documentTitle: "Tabela de correção das Leituras do TBH",
    documentRef: "PR-6.4",
  };
}
