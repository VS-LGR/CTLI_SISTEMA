export const QUOTATION_LIST_PATH = "/solicitacoes-orcamento";
export const QUOTATION_NEW_PATH = `${QUOTATION_LIST_PATH}/nova`;
export const PR_66_QUOTATION_PATH = "/requirement/6/pr-6-6?tab=solicitacoes_orcamento";

export function quotationEditorPath(id) {
  return `${QUOTATION_LIST_PATH}/${id}`;
}

export function isQuotationRequestsPath(pathname) {
  return pathname.startsWith(QUOTATION_LIST_PATH);
}
