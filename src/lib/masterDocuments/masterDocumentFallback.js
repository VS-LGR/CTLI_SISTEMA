import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";
import { DEFAULT_COLETA_FORM_CODE, DEFAULT_COLETA_FORM_TITLE, DEFAULT_COLETA_FORM_REF } from "@/lib/coletaDocMeta";

const LEGACY_BY_CODE = {
  "RE-6.2A": { code: "RE-6.2A", reference: "PR-6.2", revision: "00", title: "ADEQUAÇÃO DE COMPETÊNCIA", modelIssueDate: "2025-06-30" },
  "RE-6.2B": { code: "RE-6.2B", reference: "PR-6.2", revision: "00", title: "AVALIAÇÃO DO PERÍODO DE EXPERIÊNCIA", modelIssueDate: "2025-06-30" },
  "RE-6.2C": { code: "RE-6.2C", reference: "PR-6.2", revision: "00", title: "COMPETÊNCIA DO CARGO", modelIssueDate: "2025-06-30" },
  "RE-6.2D": { code: "RE-6.2D", reference: "PR-6.2", revision: "00", title: "LISTA DE PRESENÇA", modelIssueDate: "2025-06-30" },
  "RE-6.2E": { code: "RE-6.2E", reference: "PR-6.2", revision: "00", title: "MONITORAMENTO DE PESSOAL", modelIssueDate: "2025-06-30" },
  "RE-6.2F": { code: "RE-6.2F", reference: "PR-6.2", revision: "00", title: "SELEÇÃO DE PESSOAL", modelIssueDate: "2025-06-30" },
  "RE-6.6C": { code: "RE-6.6C", reference: "PR-6.6", revision: "00", title: "SOLICITAÇÃO DE ORÇAMENTO", modelIssueDate: "2025-06-30" },
  "RE-6.6D": { code: "RE-6.6D", reference: "PR-6.6", revision: "00", title: "PEDIDO DE COMPRA", modelIssueDate: "2025-06-30" },
  "RE-7.2A": { code: "RE-7.2A", reference: DEFAULT_COLETA_FORM_REF, revision: "00", title: DEFAULT_COLETA_FORM_TITLE, modelIssueDate: "2025-06-30" },
  "RE-7.1A": { code: "RE-7.1A", reference: "PR-7.1", revision: "00", title: "PROPOSTA COMERCIAL", modelIssueDate: "2025-06-30" },
  "RE-7.2B": { code: "RE-7.2B", reference: "PR-7.2", revision: "00", title: "CERTIFICADO DE CALIBRAÇÃO", modelIssueDate: "2025-06-30" },
  "RE-6.4B": { code: "RE-6.4B", reference: "PR-6.4", revision: "00", title: "Ficha Técnica de Dispositivo", modelIssueDate: "2025-06-30" },
  "RE-6.4.12B": { code: "RE-6.4.12B", reference: "PR-6.4.12", revision: "00", title: "Verificação de Equipamento", modelIssueDate: "2025-06-30" },
};

const LEGACY_BY_TEMPLATE = {
  "re-62a-adequacao-competencia-pdf": LEGACY_BY_CODE["RE-6.2A"],
  "re-62b-avaliacao-periodo-experiencia-pdf": LEGACY_BY_CODE["RE-6.2B"],
  "re-62c-competencias-cargo-pdf": LEGACY_BY_CODE["RE-6.2C"],
  "re-62d-lista-presenca-pdf": LEGACY_BY_CODE["RE-6.2D"],
  "re-62e-monitoramento-pessoal-pdf": LEGACY_BY_CODE["RE-6.2E"],
  "re-62f-selecao-pessoal-pdf": LEGACY_BY_CODE["RE-6.2F"],
  "re-66c-solicitacao-orcamento-pdf": LEGACY_BY_CODE["RE-6.6C"],
  "re-66d-pedido-compra-pdf": LEGACY_BY_CODE["RE-6.6D"],
  "re-72a-coleta-pdf": LEGACY_BY_CODE["RE-7.2A"],
  "re-71a-proposta-comercial-pdf": LEGACY_BY_CODE["RE-7.1A"],
  "re-72b-certificado-calibracao-pdf": LEGACY_BY_CODE["RE-7.2B"],
};

let lastFallbackWarning = null;

export function getLegacyFallbackByCode(code) {
  if (LEGACY_BY_CODE[code]) return { ...LEGACY_BY_CODE[code], usedFallback: true };
  const personnel = Object.values(PERSONNEL_DOC_DEFAULTS).find((d) => d.code === code);
  if (personnel) return { ...personnel, modelIssueDate: personnel.modelIssueDate, usedFallback: true };
  return null;
}

export function getLegacyFallbackByTemplateKey(templateKey) {
  return LEGACY_BY_TEMPLATE[templateKey] ? { ...LEGACY_BY_TEMPLATE[templateKey], usedFallback: true } : null;
}

export function warnFallbackUsage(key, type = "code") {
  const msg = `Documento não encontrado na Lista Mestra (${type}: ${key}). Usando dados padrão temporários.`;
  if (lastFallbackWarning !== msg) {
    console.warn(msg);
    lastFallbackWarning = msg;
  }
  return msg;
}

export function resolveFromRecord(record, defaultTitle = "") {
  if (!record) return null;
  return {
    title: defaultTitle || record.document_title || "",
    code: record.document_code || "",
    reference: record.document_reference || "",
    revision: record.document_revision || "00",
    modelIssueDate: record.document_model_issue_date || "",
    usedFallback: false,
  };
}

export function mergeDocumentMeta(masterDoc, recordMeta, fallback) {
  const base = masterDoc || recordMeta || fallback;
  if (!base) return null;
  return {
    title: base.title || recordMeta?.title || fallback?.title || "",
    code: base.code || recordMeta?.code || fallback?.code || "",
    reference: base.reference || recordMeta?.reference || fallback?.reference || "",
    revision: base.current_revision || base.revision || recordMeta?.revision || fallback?.revision || "00",
    modelIssueDate: base.current_issue_date || base.modelIssueDate || recordMeta?.modelIssueDate || fallback?.modelIssueDate || "",
    templateKey: base.template_key || base.templateKey || "",
    exportFileNamePattern: base.export_file_name_pattern || "",
    fileNamingRule: base.file_naming_rule || "",
    isObsolete: base.is_obsolete || base.status === "obsoleto" || false,
    usedFallback: !masterDoc && !!fallback,
    masterDocumentId: masterDoc?.id || null,
    exportTemplateConfig: base.exportTemplateConfig || base.export_template_config || {},
    certificateObservations:
      base.certificateObservations
      || base.exportTemplateConfig?.certificateObservations
      || base.export_template_config?.certificateObservations
      || null,
  };
}
