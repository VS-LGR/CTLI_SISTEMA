import { DEFAULT_PROPOSAL_MODEL_ISSUE_DATE } from "./commercialProposalDocMeta";

export const ADJUST_OPTIONS = [
  { value: "", label: "—" },
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];

export function emptyCalPoint(pointNumber = 1) {
  return { point_number: pointNumber, nominal_value: "" };
}

export function emptyScale(itemNumber = 1) {
  return {
    item_number: itemNumber,
    manufacturer: "",
    model: "",
    tag: "",
    serial_number: "",
    capacity: "",
    resolution: "",
    unit_value: "",
    calibration_points: Array.from({ length: 10 }, (_, i) => emptyCalPoint(i + 1)),
  };
}

export function emptyProposalForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    proposal_number: "",
    proposal_year: new Date().getFullYear(),
    proposal_date: today,
    document_code: "RE-7.1A",
    document_reference: "PR-7.1",
    document_revision: "00",
    document_model_issue_date: DEFAULT_PROPOSAL_MODEL_ISSUE_DATE,
    subject: "",
    end_customer_id: "",
    client_snapshot: emptyClientSnapshot(),
    adjust_before: "",
    adjust_after: "",
    notes: "",
    total_value: "",
    scales: [emptyScale(1)],
  };
}

export function emptyClientSnapshot() {
  return {
    company: "",
    address: "",
    department: "",
    attention_to: "",
    phone: "",
    email: "",
    cnpj: "",
  };
}

export function formatProposalRef(number, year) {
  if (!number) return "";
  return year ? `${number}/${year}` : String(number);
}

export function formatProposalNumber(number, year) {
  if (!number) return "—";
  return year ? `${String(number).padStart(3, "0")}/${year}` : String(number);
}

export function calibrationPointsDisplay(points = []) {
  return (points || [])
    .filter((p) => String(p.nominal_value || "").trim())
    .map((p) => p.nominal_value)
    .join(", ");
}

export function computeTotalFromScales(scales = []) {
  return scales.reduce((sum, s) => {
    const v = parseFloat(String(s.unit_value || "").replace(",", "."));
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
}

export function validateProposalForm(form) {
  if (!String(form.proposal_date || "").trim()) return "Informe a data da proposta";
  const company = form.client_snapshot?.company || "";
  if (!company.trim()) return "Informe a empresa (cliente)";
  const scales = form.scales || [];
  if (!scales.length) return "Adicione ao menos uma balança";
  for (let i = 0; i < scales.length; i++) {
    const s = scales[i];
    if (!String(s.serial_number || "").trim()) {
      return `Informe o número de série da balança ${i + 1}`;
    }
  }
  return null;
}

export function normalizeScaleForSave(scale, itemNumber) {
  const points = (scale.calibration_points || [])
    .map((p, idx) => ({
      point_number: p.point_number ?? idx + 1,
      nominal_value: String(p.nominal_value || "").trim(),
    }))
    .filter((p) => p.point_number >= 1 && p.point_number <= 10);

  const filledPoints = [];
  for (let n = 1; n <= 10; n++) {
    const existing = points.find((p) => p.point_number === n);
    if (existing?.nominal_value) filledPoints.push(existing);
  }

  return {
    item_number: itemNumber,
    manufacturer: String(scale.manufacturer || "").trim(),
    model: String(scale.model || "").trim(),
    tag: String(scale.tag || "").trim(),
    serial_number: String(scale.serial_number || "").trim(),
    capacity: String(scale.capacity || "").trim(),
    resolution: String(scale.resolution || "").trim(),
    unit_value: parseFloat(String(scale.unit_value || "0").replace(",", ".")) || 0,
    calibration_points: filledPoints,
  };
}

export function proposalRowToForm(row, scales = []) {
  return {
    proposal_number: row.proposal_number,
    proposal_year: row.proposal_year,
    proposal_date: row.proposal_date || "",
    document_code: row.document_code || "RE-7.1A",
    document_reference: row.document_reference || "PR-7.1",
    document_revision: row.document_revision || "00",
    document_model_issue_date: row.document_model_issue_date || DEFAULT_PROPOSAL_MODEL_ISSUE_DATE,
    subject: row.subject || "",
    end_customer_id: row.end_customer_id || "",
    client_snapshot: { ...emptyClientSnapshot(), ...(row.client_snapshot || {}) },
    adjust_before: row.adjust_before || "",
    adjust_after: row.adjust_after || "",
    notes: row.notes || "",
    total_value: row.total_value ?? "",
    scales: scales.length
      ? scales.map((s) => ({
          id: s.id,
          item_number: s.item_number,
          manufacturer: s.manufacturer || "",
          model: s.model || "",
          tag: s.tag || "",
          serial_number: s.serial_number || "",
          capacity: s.capacity || "",
          resolution: s.resolution || "",
          unit_value: s.unit_value ?? "",
          scale_registration_id: s.scale_registration_id || "",
          collection_id: s.collection_id || "",
          calibration_points: mergeCalibrationPoints(s.calibration_points),
        }))
      : [emptyScale(1)],
  };
}

function mergeCalibrationPoints(points = []) {
  const byNum = Object.fromEntries(
    (points || []).map((p) => [p.point_number, p.nominal_value || ""])
  );
  return Array.from({ length: 10 }, (_, i) => ({
    point_number: i + 1,
    nominal_value: byNum[i + 1] || "",
  }));
}
