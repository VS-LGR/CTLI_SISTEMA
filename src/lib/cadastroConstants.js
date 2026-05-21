/** Valores alinhados ao CHECK em `employee_registrations` (migration cadastros). */

/** Cargos recomendados como supervisor direto de outro colaborador */
export const SUPERVISOR_ELIGIBLE_JOB_ROLES = [
  "supervisor",
  "coordenador",
  "gerente",
  "diretoria",
];

export const JOB_ROLES = [
  { value: "operador", label: "Operador" },
  { value: "tecnico", label: "Técnico" },
  { value: "supervisor", label: "Supervisor" },
  { value: "coordenador", label: "Coordenador" },
  { value: "gerente", label: "Gerente" },
  { value: "diretoria", label: "Diretoria" },
  { value: "administrativo", label: "Administrativo" },
  { value: "auxiliar", label: "Auxiliar" },
  { value: "estagiario", label: "Estagiário" },
  { value: "outro", label: "Outro" },
];

export const EDUCATION_LEVELS = [
  { value: "fundamental_incompleto", label: "Fundamental incompleto" },
  { value: "fundamental_completo", label: "Fundamental completo" },
  { value: "medio_incompleto", label: "Médio incompleto" },
  { value: "medio_completo", label: "Médio completo" },
  { value: "superior_incompleto", label: "Superior incompleto" },
  { value: "superior_completo", label: "Superior completo" },
  { value: "pos_graduacao", label: "Pós-graduação" },
  { value: "mestrado_doutorado", label: "Mestrado / Doutorado" },
];

export const jobLabel = (v) => JOB_ROLES.find((x) => x.value === v)?.label || v || "—";
export const educationLabel = (v) => EDUCATION_LEVELS.find((x) => x.value === v)?.label || v || "—";

export function generateEmployeeRegistrationCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `COL-${part()}${part()}`;
}

export const CADASTRO_STORAGE_BUCKET = "cadastro-certificados";

export const ENV_EQUIPMENT_TYPES = [
  { value: "termo_higrometro", label: "Termo-higrômetro" },
  { value: "barometro", label: "Barômetro" },
  { value: "thermo_baro_higrometro", label: "Termo-baro-higrômetro" },
];

export const envEquipmentTypeLabel = (v) =>
  ENV_EQUIPMENT_TYPES.find((x) => x.value === v)?.label || v || "—";

export const WEIGHT_ITEM_UNITS = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
];
