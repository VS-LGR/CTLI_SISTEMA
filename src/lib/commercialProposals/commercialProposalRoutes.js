export const PROPOSAL_LIST_PATH = "/propostas-comerciais";
export const PROPOSAL_NEW_PATH = `${PROPOSAL_LIST_PATH}/nova`;
export const PR_71_PROPOSAL_PATH = "/requirement/7/pr-7-1?tab=propostas_comerciais";

export const COMMERCIAL_PROPOSAL_TEMPLATE_KEY = "re-71a-proposta-comercial-pdf";

export function proposalEditorPath(id) {
  return `${PROPOSAL_LIST_PATH}/${id}`;
}

export function isCommercialProposalsPath(pathname) {
  return pathname.startsWith(PROPOSAL_LIST_PATH);
}
