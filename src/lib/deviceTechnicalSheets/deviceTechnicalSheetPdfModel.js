const STATUS_LABEL = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  VENCIDO: "Vencido",
  INATIVO: "Inativo",
  A_VERIFICAR: "A verificar",
};

export function sheetStatusLabel(status) {
  return STATUS_LABEL[status] || status || "—";
}

export const SHEET_SUMMARY_HEAD = [
  "Identificação",
  "Tipo",
  "Fabricante",
  "Localização",
  "Nº cert.",
  "Lab.",
  "Calibração",
  "Próxima",
  "Verif. interm.",
  "Freq. / Status",
  "Situação",
];

function cell(value) {
  if (value == null || value === "") return "—";
  return String(value);
}

export function sheetSummaryCells(row, fmtDate = (value) => cell(value)) {
  return [
    cell(row.identification),
    cell(row.equipmentType),
    cell(row.manufacturer),
    cell(row.location),
    cell(row.certificateNumber),
    cell(row.calibratedBy),
    fmtDate(row.calibrationDate),
    fmtDate(row.nextCalibrationDate),
    cell(row.intermediateCheck),
    cell(row.frequencyStatus || row.calibrationFrequency),
    sheetStatusLabel(row.status),
  ];
}

export const SHEET_DETAIL_FIELDS = [
  ["Valor nominal", (row) => row.nominalValue],
  ["Valor convencional", (row) => row.conventionalValue],
  ["Erro encontrado", (row) => row.errorFound],
  ["Erro máx. (EP)", (row) => row.maxError],
  ["Ue atual", (row) => row.uncertainty],
  ["Ue máx.", (row) => row.maxUncertainty],
  ["Unidade", (row) => row.unit],
  ["Classe determinada (Ue)", (row) => row.equipmentClass],
  ["Classe registada", (row) => row.registeredClass],
  ["Grandeza", (row) => row.quantity],
  ["V.C. mín", (row) => row.vcMin],
  ["V.C. máx", (row) => row.vcMax],
  ["Plano de manutenção", (row) => row.maintenancePlan],
  ["Histórico de calibração", (row) => row.history],
  ["Certificado vigente", (row) => row.certificateNumber],
];

export function sheetDetailPairs(row) {
  return SHEET_DETAIL_FIELDS.map(([label, pick]) => [label, cell(pick(row))]);
}
