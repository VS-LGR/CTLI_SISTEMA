/** Valores alinhados ao CHECK em `employee_registrations` (migration cadastros). */

export const JOB_ROLES = [
  { value: "motorista", label: "Motorista" },
  { value: "auxiliar_administrativo", label: "Auxiliar Administrativo" },
  { value: "compras", label: "Compras" },
  { value: "vendas", label: "Vendas" },
  { value: "compras_vendas", label: "Compras e Vendas" },
  { value: "auxiliar_tecnico", label: "Auxiliar Técnico" },
  { value: "tecnico_em_balancas", label: "Técnico em Balanças" },
  { value: "gerente_qualidade", label: "Gerente da Qualidade" },
  { value: "gerente_tecnico", label: "Gerente Técnico" },
  { value: "signatario", label: "Signatário" },
  { value: "diretor", label: "Diretor" },
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
