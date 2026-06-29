import { formatProposalNumber } from "./commercialProposalSchema";
import { COMMERCIAL_PROPOSAL_TEMPLATE_KEY } from "./commercialProposalRoutes";
import { DEFAULT_PROPOSAL_FORM_TITLE } from "./commercialProposalDocMeta";

export async function exportCommercialProposalPdf(proposal, { logoDataUrl, tenant, tenantId, userId } = {}) {
  const { prepareMasterDocumentExport, recordMasterDocumentExport } = await import(
    "@/lib/masterDocuments/masterDocumentExportHelper"
  );
  const clientName = proposal.client_snapshot?.company || "";
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    templateKey: COMMERCIAL_PROPOSAL_TEMPLATE_KEY,
    code: proposal.document_code || "RE-7.1A",
    record: proposal,
    defaultTitle: DEFAULT_PROPOSAL_FORM_TITLE,
    fileNameContext: {
      numero: formatProposalNumber(proposal.proposal_number, proposal.proposal_year),
      cliente: clientName,
      data: proposal.proposal_date,
    },
  });
  const mod = await import(
    /* webpackChunkName: "commercial-proposal-pdf" */
    "@/lib/commercialProposalPdf/drawCommercialProposalPdf"
  );
  mod.drawCommercialProposalPdf(proposal, { logoDataUrl, documentMeta: meta, tenant, fileName });
  if (tenantId) {
    await recordMasterDocumentExport({
      tenantId,
      meta,
      fileName,
      sourceModule: "commercial-proposal",
      sourceRecordId: proposal.id,
      generatedById: userId,
    });
  }
}
