import { mergeColetaPayload } from "./coletaSchema";
import { coletaDocMetaFromTenant } from "./coletaDocMeta";

export function buildColetaDocumentModel(row, tenantName = "", tenant = null) {
  const p = mergeColetaPayload(row?.payload);
  const prop = row?.commercial_proposal_ref || "";
  const meta = coletaDocMetaFromTenant(tenant);
  return {
    tenantName,
    commercialProposalRef: prop,
    payload: p,
    header: {
      title: "COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA",
      code: `Cód. ${meta.code}  Ref. ${meta.ref}  ${meta.revision}`,
      proposal: prop ? `Referente à Proposta Comercial: ${prop}` : "Referente à Proposta Comercial:",
    },
  };
}
