import { addDashboardReminder } from "@/lib/dashboardApi";
import { formatProposalRef } from "@/lib/commercialProposals/commercialProposalSchema";
import { formatCollectionRef } from "@/lib/coletaOsMeta";

/**
 * Aviso leve no dashboard quando coleta sai de rascunho para preenchida/conferida.
 * Fora de escopo BPx crítico — lembrete operacional no mesmo tenant.
 */
export async function notifyColetaStatusChange({
  tenantId,
  kind = "balanca",
  status,
  clientName = "",
  proposalRef = "",
  collectionNumber = null,
  collectionYear = null,
}) {
  if (!tenantId) return;
  if (!["preenchida", "conferida"].includes(status)) return;

  const kindLabel = kind === "weight" ? "pesos" : "balança";
  const statusLabel = status === "conferida" ? "conferida" : "preenchida";
  const os = formatCollectionRef(collectionNumber, collectionYear);
  const parts = [
    `Coleta de ${kindLabel} ${statusLabel}`,
    clientName ? `— ${clientName}` : "",
    proposalRef ? `(proposta ${proposalRef})` : "",
    os ? `OS ${os}` : "",
    "— aguarda certificado.",
  ].filter(Boolean);

  try {
    await addDashboardReminder(tenantId, parts.join(" "));
  } catch {
    /* reminder is best-effort */
  }
}

export function proposalRefFromPayload(payload, fallback = "") {
  return (
    payload?.geral?.processo_numero
    || payload?.commercial_proposal_ref
    || fallback
    || ""
  );
}

export function formatProposalRefSafe(number, year) {
  try {
    return formatProposalRef(number, year);
  } catch {
    return "";
  }
}
