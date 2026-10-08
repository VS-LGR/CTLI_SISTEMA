import { sheetDetailPairs, sheetSummaryCells, SHEET_SUMMARY_HEAD } from "./deviceTechnicalSheetPdfModel";

describe("deviceTechnicalSheetPdfModel", () => {
  const row = {
    identification: "P-01",
    equipmentType: "Peso Padrão",
    manufacturer: "Marca",
    location: "Lab",
    certificateNumber: "C-9",
    calibratedBy: "Lab X",
    calibrationDate: "2026-01-01",
    nextCalibrationDate: "2027-01-01",
    intermediateCheck: "2026-07-01",
    frequencyStatus: "Anual",
    status: "APROVADO",
    nominalValue: "100",
    conventionalValue: "100,01",
    equipmentClass: "F1",
    registeredClass: "F2",
    uncertainty: "0,02",
  };

  it("resume só até à situação", () => {
    const cells = sheetSummaryCells(row, (value) => value || "—");
    expect(SHEET_SUMMARY_HEAD).toHaveLength(11);
    expect(cells).toHaveLength(11);
    expect(cells[0]).toBe("P-01");
    expect(cells.at(-1)).toBe("Aprovado");
    expect(cells.join(" ")).not.toContain("100,01");
  });

  it("leva a classe determinada e a registada para o detalhe", () => {
    const pairs = sheetDetailPairs(row);
    expect(pairs).toContainEqual(["Classe determinada (Ue)", "F1"]);
    expect(pairs).toContainEqual(["Classe registada", "F2"]);
    expect(pairs).toContainEqual(["Valor convencional", "100,01"]);
  });
});
