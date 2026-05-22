/**
 * Metadados de conteúdo por pasta (requisitos 4–5).
 * section: procedimento | registro | documento | assinatura
 */

export const DOCUMENT_SECTIONS = {
  procedimento: { id: "procedimento", label: "Procedimentos" },
  registro: { id: "registro", label: "Registros" },
  documento: { id: "documento", label: "Documentos" },
  assinatura: { id: "assinatura", label: "Assinaturas" },
};

/** Pastas com regras especiais (requisito 5). Requisito 4 pr-4-1 usa default (procedimento + registro). */
const FOLDER_MODES = {
  "manual-qualidade": { sections: ["procedimento"], defaultSection: "procedimento", richEditor: true },
  "documentacao-legal": { sections: ["documento"], defaultSection: "documento", richEditor: false, fileOnly: true },
  "estrutura-organizacional": { sections: ["registro"], defaultSection: "registro", richEditor: true },
  "politica-qualidade": { sections: ["registro"], defaultSection: "registro", richEditor: true },
  assinaturas: { sections: ["assinatura"], defaultSection: "assinatura", richEditor: false, signatures: true },
};

const DEFAULT_MODE = {
  sections: ["procedimento", "registro"],
  defaultSection: "procedimento",
  richEditor: true,
};

export function getFolderDocumentMode(requirementId, folderKey) {
  const rid = String(requirementId);
  if (rid === "5" && folderKey && FOLDER_MODES[folderKey]) {
    return { ...FOLDER_MODES[folderKey] };
  }
  return { ...DEFAULT_MODE };
}

export function getVisibleSections(requirementId, folderKey) {
  const mode = getFolderDocumentMode(requirementId, folderKey);
  return mode.sections.map((id) => DOCUMENT_SECTIONS[id]).filter(Boolean);
}

export function isSignaturesFolder(requirementId, folderKey) {
  return getFolderDocumentMode(requirementId, folderKey).signatures === true;
}

export function isFileOnlyFolder(requirementId, folderKey) {
  return getFolderDocumentMode(requirementId, folderKey).fileOnly === true;
}

export function allowsRichEditor(requirementId, folderKey) {
  return getFolderDocumentMode(requirementId, folderKey).richEditor !== false;
}
