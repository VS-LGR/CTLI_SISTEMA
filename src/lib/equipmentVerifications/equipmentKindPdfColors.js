/** Cores de cabeçalho PDF por tipo de equipamento (RE-6.4.12B / agendas). */
export const EQUIPMENT_KIND_PDF_COLORS = {
  pesos: {
    fill: [37, 99, 235],
    label: "Peso",
  },
  thermo: {
    fill: [217, 119, 6],
    label: "Thermo",
  },
  computador: {
    fill: [71, 85, 105],
    label: "Computador",
  },
  veiculo: {
    fill: [22, 163, 74],
    label: "Veículo",
  },
};

export function equipmentKindPdfFill(kind) {
  return EQUIPMENT_KIND_PDF_COLORS[kind]?.fill || [37, 99, 235];
}
