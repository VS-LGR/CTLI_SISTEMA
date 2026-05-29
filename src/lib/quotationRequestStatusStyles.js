import { statusLabel } from "@/lib/quotationRequestTypes";

const STATUS_STYLES = {
  rascunho: "bg-slate-100 text-slate-700 border-slate-300",
  aguardando_envio: "bg-amber-50 text-amber-900 border-amber-200",
  enviada_fornecedor: "bg-sky-50 text-sky-900 border-sky-200",
  orcamento_recebido: "bg-indigo-50 text-indigo-900 border-indigo-200",
  em_analise: "bg-violet-50 text-violet-900 border-violet-200",
  aprovada: "bg-emerald-50 text-emerald-900 border-emerald-200",
  reprovada: "bg-red-50 text-red-800 border-red-200",
  convertida_pedido_compra: "bg-teal-50 text-teal-900 border-teal-200",
  cancelada: "bg-slate-100 text-slate-500 border-slate-200 line-through decoration-slate-400",
};

export function getStatusBadgeClass(status) {
  return STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-300";
}

export function getStatusDisplayLabel(status) {
  return statusLabel(status);
}
