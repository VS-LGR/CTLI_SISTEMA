export const CERTIFICATE_REQ_ID = "7";
export const CERTIFICATE_FOLDER_KEY = "pr-7-2";

export const CERTIFICATE_LIST_PATH = `/requirement/${CERTIFICATE_REQ_ID}/${CERTIFICATE_FOLDER_KEY}/certificados`;
export const CERTIFICATE_NEW_PATH = `${CERTIFICATE_LIST_PATH}/nova`;
export const CERTIFICATE_PENDING_APPROVAL_PATH = `${CERTIFICATE_LIST_PATH}?status=aguardando_aprovacao`;

export function certificateEditorPath(id) {
  return `${CERTIFICATE_LIST_PATH}/${id}`;
}

export function isCertificatePath(pathname) {
  return pathname.startsWith(CERTIFICATE_LIST_PATH);
}

export function isPr72ModulePath(pathname) {
  return pathname.includes(`/requirement/${CERTIFICATE_REQ_ID}/${CERTIFICATE_FOLDER_KEY}/`);
}
