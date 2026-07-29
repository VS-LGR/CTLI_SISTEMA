export const MAINTENANCE_PROGRAM_REQ_ID = "6";
export const MAINTENANCE_PROGRAM_FOLDER_KEY = "pr-6-4-12";
export const MAINTENANCE_PROGRAM_PATH =
  `/requirement/${MAINTENANCE_PROGRAM_REQ_ID}/${MAINTENANCE_PROGRAM_FOLDER_KEY}/programa-manutencao`;

export function isMaintenanceProgramPath(pathname) {
  return pathname?.startsWith(MAINTENANCE_PROGRAM_PATH);
}
