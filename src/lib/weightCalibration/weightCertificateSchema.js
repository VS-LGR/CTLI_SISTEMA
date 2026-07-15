/** RE-5.4.2B — Certificado de Calibração de Pesos-Padrão */

export const DOC_CODE = "RE-5.4.2B";
export const DOC_REF = "PR-7.2";
export const TEMPLATE_KEY = "re-542b-certificado-peso-padrao-pdf";
export const COLETA_DOC_CODE = "RE-5.4.2A";

export const CERTIFICATE_DOC_CODE = DOC_CODE;
export const CERTIFICATE_DOC_REF = DOC_REF;
export const CERTIFICATE_TEMPLATE_KEY = TEMPLATE_KEY;

export const MAX_ITEMS = 24;

export const WEIGHT_CLASSES = ["E1", "E2", "F1", "F2", "M1", "M1-2", "M2", "M2-3", "M3"];

export const MATERIALS = [
  "Alumínio",
  "Níquel",
  "Inox",
  "Latão / Bronze",
  "Ferro Fundido",
  "Ferro",
  "Plástico",
];

export const COLETA_WORKFLOW_STATUSES = [
  { value: "rascunho", label: "Rascunho" },
  { value: "preenchida", label: "Preenchida" },
  { value: "conferida", label: "Conferida" },
  { value: "aprovada_certificado", label: "Aprovada para Certificado" },
  { value: "certificado_gerado", label: "Certificado Gerado" },
  { value: "cancelada", label: "Cancelada" },
];

export const CERTIFICATE_STATUSES = [
  { value: "rascunho", label: "Rascunho" },
  { value: "calculado", label: "Calculado" },
  { value: "em_revisao_tecnica", label: "Em Revisão Técnica" },
  { value: "aguardando_aprovacao", label: "Aguardando Aprovação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "emitido", label: "Emitido" },
  { value: "enviado", label: "Enviado ao cliente" },
  { value: "substituido", label: "Substituído" },
  { value: "cancelado", label: "Cancelado" },
  { value: "obsoleto", label: "Obsoleto" },
  { value: "reprovado", label: "Reprovado" },
];

export const CERTIFICATE_TYPES = [
  { value: "rbc", label: "RBC" },
  { value: "rastreavel", label: "Rastreável" },
];

export const CONFORMITY_RESULTS = [
  { value: "conforme", label: "Conforme" },
  { value: "nao_conforme", label: "Não Conforme" },
  { value: "nao_avaliado", label: "Não Avaliado" },
  { value: "nao_aplicavel", label: "Não Aplicável" },
];

export const STANDARD_TYPES = [
  { value: "balanca_laboratorio", label: "Balança de laboratório" },
  { value: "peso_padrao", label: "Peso-padrão" },
  { value: "termo_baro_higrometro", label: "Termo-baro-higrômetro" },
  { value: "outro", label: "Outro instrumento auxiliar" },
];

export const CRITICAL_ANALYSIS_CHECKLIST = [
  { key: "client_data_checked", label: "Dados do cliente conferidos" },
  { key: "weights_data_checked", label: "Dados dos pesos conferidos" },
  { key: "standards_valid", label: "Padrões utilizados válidos" },
  { key: "environmental_filled", label: "Condições ambientais preenchidas" },
  { key: "items_filled", label: "Itens de calibração preenchidos" },
  { key: "calculations_ok", label: "Cálculos realizados sem erro" },
  { key: "uncertainty_calculated", label: "Incerteza calculada" },
  { key: "conformity_evaluated", label: "Conformidade avaliada quando aplicável" },
  { key: "executor_defined", label: "Executor definido" },
  { key: "signatory_defined", label: "Signatário definido" },
  { key: "preview_reviewed", label: "Certificado em prévia revisado" },
];

export const COLETA_OFFICIAL_STATUSES = ["conferida", "aprovada_certificado"];
export const COLETA_PREVIEW_STATUSES = ["rascunho", "preenchida", ...COLETA_OFFICIAL_STATUSES];

export const EDITABLE_CERTIFICATE_STATUSES = ["rascunho", "calculado", "em_revisao_tecnica", "reprovado"];
export const LOCKED_CERTIFICATE_STATUSES = ["aprovado", "emitido", "enviado", "substituido", "cancelado", "obsoleto"];

export function coletaWorkflowLabel(value) {
  return COLETA_WORKFLOW_STATUSES.find((s) => s.value === value)?.label || value || "—";
}

export function certificateStatusLabel(value) {
  return CERTIFICATE_STATUSES.find((s) => s.value === value)?.label || value || "—";
}

export function certificateTypeLabel(value) {
  return CERTIFICATE_TYPES.find((t) => t.value === value)?.label || value || "—";
}

export function conformityLabel(value) {
  return CONFORMITY_RESULTS.find((c) => c.value === value)?.label || value || "—";
}

export function formatCertificateNumber(num, year) {
  if (num == null || !year) return "—";
  return `${num}/${year}`;
}

export function canColetaGenerateOfficial(workflowStatus) {
  return COLETA_OFFICIAL_STATUSES.includes(workflowStatus);
}

export function isCertificateEditable(status) {
  return EDITABLE_CERTIFICATE_STATUSES.includes(status);
}

export function emptyCriticalChecklist() {
  return Object.fromEntries(CRITICAL_ANALYSIS_CHECKLIST.map((c) => [c.key, false]));
}

export function canTransitionCertificateStatus(from, to) {
  const map = {
    rascunho: ["calculado", "cancelado", "obsoleto"],
    calculado: ["em_revisao_tecnica", "aguardando_aprovacao", "rascunho", "cancelado", "obsoleto"],
    em_revisao_tecnica: ["aguardando_aprovacao", "calculado", "cancelado", "obsoleto"],
    aguardando_aprovacao: ["aprovado", "reprovado", "cancelado", "obsoleto"],
    aprovado: ["emitido", "enviado", "cancelado", "obsoleto"],
    reprovado: ["calculado", "rascunho", "cancelado", "obsoleto"],
    emitido: ["substituido", "cancelado", "enviado"],
    enviado: ["substituido", "cancelado", "enviado"],
    substituido: ["obsoleto"],
    cancelado: ["obsoleto"],
    obsoleto: [],
  };
  return (map[from] || []).includes(to);
}

export const OBSOLETABLE_CERTIFICATE_STATUSES = [
  "cancelado", "substituido", "reprovado", "rascunho", "calculado",
  "em_revisao_tecnica", "aguardando_aprovacao", "aprovado", "enviado",
];

export const INACTIVE_CERTIFICATE_STATUSES = ["cancelado", "substituido", "obsoleto"];

export function canMarkCertificateObsolete(status) {
  return OBSOLETABLE_CERTIFICATE_STATUSES.includes(status);
}

export function canDeleteCertificate(status) {
  return EDITABLE_CERTIFICATE_STATUSES.includes(status) || status === "obsoleto";
}
