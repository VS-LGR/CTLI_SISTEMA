/** Rotas do certificado RE-5.4.2B (pesos-padrão) dentro de PR-7.2 */

export const WEIGHT_CERTIFICATE_REQ_ID = "7";
export const WEIGHT_CERTIFICATE_FOLDER_KEY = "pr-7-2";

export const WEIGHT_CERTIFICATE_LIST_PATH = `/requirement/${WEIGHT_CERTIFICATE_REQ_ID}/${WEIGHT_CERTIFICATE_FOLDER_KEY}/pesos/certificados`;
export const WEIGHT_CERTIFICATE_NEW_PATH = `${WEIGHT_CERTIFICATE_LIST_PATH}/nova`;
export const WEIGHT_CERTIFICATE_PENDING_APPROVAL_PATH = `${WEIGHT_CERTIFICATE_LIST_PATH}?status=aguardando_aprovacao`;

export function weightCertificateEditorPath(id) {
  return `${WEIGHT_CERTIFICATE_LIST_PATH}/${id}`;
}

export function isWeightCertificatePath(pathname) {
  return pathname.startsWith(WEIGHT_CERTIFICATE_LIST_PATH);
}

export function isWeightCalibrationPath(pathname) {
  return pathname.includes(`/requirement/${WEIGHT_CERTIFICATE_REQ_ID}/${WEIGHT_CERTIFICATE_FOLDER_KEY}/pesos/`);
}
