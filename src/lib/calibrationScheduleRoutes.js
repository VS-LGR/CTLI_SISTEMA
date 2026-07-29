export const CALIBRATION_SCHEDULE_REQ_ID = "6";
export const CALIBRATION_SCHEDULE_FOLDER_KEY = "pr-6-4";
export const CALIBRATION_SCHEDULE_PATH =
  `/requirement/${CALIBRATION_SCHEDULE_REQ_ID}/${CALIBRATION_SCHEDULE_FOLDER_KEY}/cronograma`;

export function isCalibrationSchedulePath(pathname) {
  return pathname?.startsWith(CALIBRATION_SCHEDULE_PATH);
}
