export const DEVICE_SHEET_REQ_ID = "6";
export const DEVICE_SHEET_FOLDER_KEY = "pr-6-4";
export const DEVICE_SHEET_LIST_PATH = `/requirement/${DEVICE_SHEET_REQ_ID}/${DEVICE_SHEET_FOLDER_KEY}/fichas`;

export function isDeviceSheetPath(pathname) {
  return pathname?.startsWith(DEVICE_SHEET_LIST_PATH);
}
