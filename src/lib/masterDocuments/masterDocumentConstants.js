export const MASTER_DOCUMENT_TYPES = [
  { id: "manual", label: "Manual da Qualidade" },
  { id: "politica", label: "Política" },
  { id: "procedimento", label: "Procedimento" },
  { id: "registro", label: "Registro da Qualidade" },
  { id: "planilha_software", label: "Planilha / Software" },
  { id: "documento_externo", label: "Documento Externo" },
  { id: "template_exportacao", label: "Template de Exportação" },
  { id: "relatorio", label: "Relatório" },
  { id: "lista", label: "Lista" },
  { id: "anexo", label: "Anexo" },
  { id: "documento_interno", label: "Documento Interno" },
];

export const MASTER_DOCUMENT_STATUSES = [
  { id: "rascunho", label: "Rascunho" },
  { id: "ativo", label: "Ativo" },
  { id: "em_revisao", label: "Em Revisão" },
  { id: "obsoleto", label: "Obsoleto" },
  { id: "retido_como_obsoleto", label: "Retido como Obsoleto" },
  { id: "substituido", label: "Substituído" },
  { id: "cancelado", label: "Cancelado" },
  { id: "externo_em_verificacao", label: "Documento Externo em Verificação" },
  { id: "externo_desatualizado", label: "Documento Externo Desatualizado" },
];

export const MASTER_DOCUMENT_CATEGORIES = [
  "Sistema de Gestão", "Pessoal", "Equipamentos", "Compras", "Comercial",
  "Técnico", "Calibração", "Registros", "Auditoria", "Análise Crítica",
  "Documentos Externos", "Templates PDF",
];

export const REVISION_STATUSES = [
  { id: "rascunho", label: "Rascunho" },
  { id: "vigente", label: "Vigente" },
  { id: "obsoleta", label: "Obsoleta" },
  { id: "cancelada", label: "Cancelada" },
];

export const COPY_TYPES = [
  { id: "original", label: "Original" },
  { id: "copia_controlada", label: "Cópia Controlada" },
  { id: "copia_eletronica", label: "Cópia Eletrônica" },
  { id: "copia_nao_controlada", label: "Cópia Não Controlada" },
];

export const EXTERNAL_VALIDITY_STATUSES = [
  { id: "valido", label: "Válido" },
  { id: "pendente_consulta", label: "Pendente de Consulta" },
  { id: "revisao_identificada", label: "Com Revisão Identificada" },
  { id: "desatualizado", label: "Desatualizado" },
  { id: "substituido", label: "Substituído" },
  { id: "indisponivel", label: "Indisponível" },
];

export const CRITICAL_ANALYSIS_RESULTS = [
  "Mantido sem alteração",
  "Revisar documento",
  "Tornar obsoleto",
  "Substituir documento",
  "Cancelar documento",
];

export const INTERNAL_TYPES = new Set([
  "manual", "politica", "procedimento", "registro", "planilha_software",
  "template_exportacao", "relatorio", "lista", "anexo", "documento_interno",
]);

export const OBSOLETE_STATUSES = new Set(["obsoleto", "retido_como_obsoleto", "cancelado"]);

export function typeLabel(id) {
  return MASTER_DOCUMENT_TYPES.find((t) => t.id === id)?.label || id || "—";
}

export function statusLabel(id) {
  return MASTER_DOCUMENT_STATUSES.find((s) => s.id === id)?.label || id || "—";
}

export function revisionStatusLabel(id) {
  return REVISION_STATUSES.find((s) => s.id === id)?.label || id || "—";
}

export function copyTypeLabel(id) {
  return COPY_TYPES.find((c) => c.id === id)?.label || id || "—";
}

export function externalValidityLabel(id) {
  return EXTERNAL_VALIDITY_STATUSES.find((s) => s.id === id)?.label || id || "—";
}
