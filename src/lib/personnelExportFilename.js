import { displayValue, formatDateBr } from "@/lib/quotationRequestDisplay";

export const PERSONNEL_EXPORT_TITLES = {
  competency: "Competencia de Cargo",
  adequacy: "Adequação de Competencia",
  monitoring: "Monitoramento de Pessoal",
  experience: "Avaliação do Periodo de Experiencia",
  selection: "Seleção de Pessoal",
  attendance: "Lista de Presença",
};

function sanitizeFilenamePart(value) {
  return String(value ?? "")
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/**
 * @param {{ code: string, title: string, revision?: string, issueDate?: string, subject?: string, ext?: string }} params
 */
export function buildPersonnelExportFilename({
  code,
  title,
  revision,
  issueDate,
  subject,
  ext = "pdf",
}) {
  const rev = displayValue(revision);
  const date = formatDateBr(issueDate);
  const safeSubject = sanitizeFilenamePart(subject) || "documento";
  const safeTitle = sanitizeFilenamePart(title);
  const safeCode = sanitizeFilenamePart(code);
  const base = `${safeCode} - ${safeTitle} Rev. ${rev} ${date} - ${safeSubject}`;
  return `${base}.${ext.replace(/^\./, "")}`;
}

export function competencyExportFilename(position, ext = "pdf") {
  return buildPersonnelExportFilename({
    code: "RE-6.2C",
    title: PERSONNEL_EXPORT_TITLES.competency,
    revision: position.document_revision,
    issueDate: position.document_model_issue_date,
    subject: position.title,
    ext,
  });
}

export function adequacyExportFilename(record, ext = "pdf") {
  return buildPersonnelExportFilename({
    code: "RE-6.2A",
    title: PERSONNEL_EXPORT_TITLES.adequacy,
    revision: record.document_revision,
    issueDate: record.document_model_issue_date,
    subject: [record.occupant_name, record.position_title].filter(Boolean).join(" - "),
    ext,
  });
}

export function monitoringExportFilename(record, ext = "pdf") {
  return buildPersonnelExportFilename({
    code: "RE-6.2E",
    title: PERSONNEL_EXPORT_TITLES.monitoring,
    revision: record.document_revision,
    issueDate: record.document_model_issue_date,
    subject: record.occupant_name,
    ext,
  });
}

export function experienceExportFilename(record, ext = "pdf") {
  return buildPersonnelExportFilename({
    code: "RE-6.2B",
    title: PERSONNEL_EXPORT_TITLES.experience,
    revision: record.document_revision,
    issueDate: record.document_model_issue_date,
    subject: record.occupant_name,
    ext,
  });
}

export function selectionExportFilename(record, ext = "pdf") {
  return buildPersonnelExportFilename({
    code: "RE-6.2F",
    title: PERSONNEL_EXPORT_TITLES.selection,
    revision: record.document_revision,
    issueDate: record.document_model_issue_date,
    subject: record.candidate_name,
    ext,
  });
}

export function attendanceExportFilename(record, ext = "pdf") {
  return buildPersonnelExportFilename({
    code: "RE-6.2D",
    title: PERSONNEL_EXPORT_TITLES.attendance,
    revision: record.document_revision,
    issueDate: record.document_model_issue_date,
    subject: record.course_title,
    ext,
  });
}

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
