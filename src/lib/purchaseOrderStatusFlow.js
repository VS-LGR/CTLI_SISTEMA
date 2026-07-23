import { PURCHASE_ORDER_STATUSES, canTransitionStatus, statusLabel } from "@/lib/purchaseOrderTypes";

/** Etapas visuais do fluxo (UI). */
export const PURCHASE_ORDER_FLOW_STEPS = [
  { id: "rascunho", label: "Rascunho", statuses: ["rascunho"] },
  { id: "aprovacao", label: "Aprovação", statuses: ["aguardando_aprovacao_tecnica"] },
  { id: "aprovado", label: "Aprovado", statuses: ["aprovado_tecnicamente"] },
  { id: "enviado", label: "Enviado", statuses: ["enviado_fornecedor"] },
  { id: "recebimento", label: "Em recebimento", statuses: ["aguardando_recebimento", "recebido_parcialmente"] },
  { id: "encerrado", label: "Encerrado", statuses: ["recebido", "reprovado_recebimento", "cancelado"] },
];

const STATUS_HELP = {
  rascunho: "Pedido em elaboração. Revise os dados e submeta para aprovação técnica.",
  aguardando_aprovacao_tecnica: "Aguardando validação do gerente técnico.",
  aprovado_tecnicamente: "Aprovado tecnicamente. Pode enviar ao provedor.",
  enviado_fornecedor: "Pedido enviado ao provedor. Aguarde o recebimento dos itens.",
  aguardando_recebimento: "Itens a caminho ou aguardando conferência. Preencha a inspeção antes de encerrar.",
  recebido_parcialmente: "Parte dos itens recebida. Conclua ou reprove conforme necessário.",
  recebido: "Pedido concluído. Pode reabrir para aguardando recebimento se precisar corrigir.",
  reprovado_recebimento: "Recebimento reprovado. Pode reabrir para aguardando recebimento.",
  cancelado: "Pedido cancelado. Pode reabrir para rascunho.",
};

const ACTION_LABELS = {
  aguardando_aprovacao_tecnica: "Submeter para aprovação técnica",
  aprovado_tecnicamente: "Marcar como aprovado tecnicamente",
  enviado_fornecedor: "Marcar como enviado ao provedor",
  aguardando_recebimento: "Marcar como aguardando recebimento",
  recebido: "Marcar como recebido",
  recebido_parcialmente: "Marcar como recebido parcialmente",
  reprovado_recebimento: "Reprovar recebimento",
  rascunho: "Voltar para rascunho",
  cancelado: "Cancelar pedido",
};

/** Ordem preferida quando há várias saídas válidas (primeira = ação principal). */
const NEXT_PRIORITY = [
  "aguardando_aprovacao_tecnica",
  "aprovado_tecnicamente",
  "enviado_fornecedor",
  "aguardando_recebimento",
  "recebido",
  "recebido_parcialmente",
  "reprovado_recebimento",
  "rascunho",
  "cancelado",
];

export function getStatusHelp(status) {
  return STATUS_HELP[status] || "";
}

function getActionLabel(fromStatus, target) {
  if (target === "aguardando_recebimento" && (fromStatus === "recebido" || fromStatus === "reprovado_recebimento")) {
    return "Reabrir — aguardando recebimento";
  }
  if (target === "rascunho" && fromStatus === "cancelado") {
    return "Reabrir — rascunho";
  }
  return ACTION_LABELS[target] || statusLabel(target);
}

export function getFlowStepIndex(status) {
  const idx = PURCHASE_ORDER_FLOW_STEPS.findIndex((s) => s.statuses.includes(status));
  return idx >= 0 ? idx : 0;
}

/**
 * @returns {{ target: string, label: string, variant: 'primary'|'secondary'|'destructive' }[]}
 */
export function getNextStatusActions(currentStatus) {
  const allowed = PURCHASE_ORDER_STATUSES.map((s) => s.id).filter((t) =>
    canTransitionStatus(currentStatus, t),
  );
  allowed.sort((a, b) => {
    const ia = NEXT_PRIORITY.indexOf(a);
    const ib = NEXT_PRIORITY.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  const actions = allowed.map((target) => ({
    target,
    label: getActionLabel(currentStatus, target),
    variant: target === "cancelado" ? "destructive" : "primary",
  }));

  const nonCancel = actions.filter((a) => a.target !== "cancelado");
  const cancel = actions.filter((a) => a.target === "cancelado");

  if (nonCancel.length <= 1) {
    return [...nonCancel.map((a) => ({ ...a, variant: "primary" })), ...cancel];
  }

  const [primary, ...secondary] = nonCancel;
  return [
    { ...primary, variant: "primary" },
    ...secondary.map((a) => ({ ...a, variant: "secondary" })),
    ...cancel,
  ];
}
