import { FORM_COLORS } from "@/lib/institutionalPdf/theme";

/**
 * Etiquetas por tipo de equipamento (RE-6.4.12B / agendas).
 * Cabeçalhos de tabela usam cinza institucional — sem paleta colorida por kind.
 */
export const EQUIPMENT_KIND_PDF_COLORS = {
  pesos: { label: "Peso" },
  thermo: { label: "Thermo" },
  computador: { label: "Computador" },
  veiculo: { label: "Veículo" },
};

/** Fill de cabeçalho de tabela — sempre cinza institucional. */
export function equipmentKindPdfFill(_kind) {
  return FORM_COLORS.tableHeader;
}

export function equipmentKindPdfLabel(kind) {
  return EQUIPMENT_KIND_PDF_COLORS[kind]?.label || String(kind || "—");
}
