import { displayValue } from "@/lib/quotationRequestDisplay";

/** Bloco opcional colaborador/cargo/documento abaixo do cabeçalho PDF */
export function buildPersonnelSubjectMetaRows({
  documentCode,
  occupantName,
  positionTitle,
  registrationNumber,
  candidateName,
} = {}) {
  const rows = [];
  if (documentCode) rows.push(["Documento", documentCode]);
  if (occupantName) rows.push(["Colaborador", occupantName]);
  if (candidateName) rows.push(["Candidato", candidateName]);
  if (positionTitle) rows.push(["Cargo", positionTitle]);
  if (registrationNumber) rows.push(["Matrícula", registrationNumber]);
  return rows.map(([label, value]) => [label, displayValue(value)]);
}

export function personnelPdfSlug(parts) {
  return (parts || []).filter(Boolean).join("-").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "documento";
}
