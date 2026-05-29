import { QUOTATION_REQUEST_STATUSES, canTransitionStatus, statusLabel } from "@/lib/quotationRequestTypes";

export const QUOTATION_FLOW_STEPS = [
  { id: "rascunho", label: "Rascunho", statuses: ["rascunho"] },
  { id: "envio", label: "Envio", statuses: ["aguardando_envio", "enviada_fornecedor"] },
  { id: "retorno", label: "Retorno", statuses: ["orcamento_recebido"] },
  { id: "analise", label: "Análise", statuses: ["em_analise"] },
  { id: "decisao", label: "Decisão", statuses: ["aprovada", "reprovada", "convertida_pedido_compra", "cancelada"] },
];

const STATUS_HELP = {
  rascunho: "Solicitação em elaboração. Preencha os dados e exporte o PDF quando estiver pronta.",
  aguardando_envio: "Pronta para envio ao fornecedor.",
  enviada_fornecedor: "Enviada ao fornecedor. Aguarde o retorno do orçamento.",
  orcamento_recebido: "Orçamento recebido do fornecedor.",
  em_analise: "Orçamento em análise interna.",
  aprovada: "Solicitação aprovada.",
  reprovada: "Solicitação reprovada.",
  convertida_pedido_compra: "Convertida em pedido de compra.",
  cancelada: "Solicitação cancelada.",
};

const ACTION_LABELS = {
  aguardando_envio: "Marcar aguardando envio",
  enviada_fornecedor: "Registrar envio ao fornecedor",
  orcamento_recebido: "Registrar orçamento recebido",
  em_analise: "Marcar em análise",
  aprovada: "Aprovar solicitação",
  reprovada: "Reprovar solicitação",
  rascunho: "Voltar para rascunho",
  cancelada: "Cancelar solicitação",
};

const NEXT_PRIORITY = [
  "aguardando_envio",
  "enviada_fornecedor",
  "orcamento_recebido",
  "em_analise",
  "aprovada",
  "reprovada",
  "rascunho",
  "cancelada",
];

export function getQuotationStatusHelp(status) {
  return STATUS_HELP[status] || "";
}

export function getQuotationFlowStepIndex(status) {
  const idx = QUOTATION_FLOW_STEPS.findIndex((s) => s.statuses.includes(status));
  return idx >= 0 ? idx : 0;
}

export function getQuotationNextStatusActions(currentStatus) {
  const allowed = QUOTATION_REQUEST_STATUSES.map((s) => s.id).filter((t) =>
    canTransitionStatus(currentStatus, t),
  );
  allowed.sort((a, b) => {
    const ia = NEXT_PRIORITY.indexOf(a);
    const ib = NEXT_PRIORITY.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  return allowed.map((target) => ({
    target,
    label: ACTION_LABELS[target] || statusLabel(target),
    variant: target === "cancelada" || target === "reprovada" ? "destructive" : "secondary",
  }));
}
