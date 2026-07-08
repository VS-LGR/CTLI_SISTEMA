export const EQUIPMENT_VERIFICATION_REQ_ID = "6";
export const EQUIPMENT_VERIFICATION_FOLDER_KEY = "pr-6-4-12";
export const EQUIPMENT_VERIFICATION_LIST_PATH =
  `/requirement/${EQUIPMENT_VERIFICATION_REQ_ID}/${EQUIPMENT_VERIFICATION_FOLDER_KEY}/verificacoes`;

export function equipmentVerificationEditorPath(id) {
  return `${EQUIPMENT_VERIFICATION_LIST_PATH}/${id}`;
}

export function isEquipmentVerificationPath(pathname) {
  return pathname?.startsWith(EQUIPMENT_VERIFICATION_LIST_PATH);
}
