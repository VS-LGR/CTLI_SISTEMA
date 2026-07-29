import {
  buildMaintenanceScheduleRows,
  defaultAssetLabel,
  markSymbol,
  nextMarkStatus,
  quarterFromMonth,
  DEFAULT_PLANNED_MONTHS,
} from "./maintenanceProgramsApi";

describe("maintenanceProgramsApi", () => {
  test("nextMarkStatus ciclo vazio → x → y → vazio", () => {
    expect(nextMarkStatus(null)).toBe("planejado");
    expect(nextMarkStatus("planejado")).toBe("executado");
    expect(nextMarkStatus("executado")).toBe(null);
  });

  test("markSymbol", () => {
    expect(markSymbol("planejado")).toBe("x");
    expect(markSymbol("executado")).toBe("y");
    expect(markSymbol(null)).toBe("");
  });

  test("meses padrão Excel Fev/Jun/Out", () => {
    expect(DEFAULT_PLANNED_MONTHS).toEqual([2, 6, 10]);
    expect(quarterFromMonth(2)).toBe(1);
    expect(quarterFromMonth(6)).toBe(2);
    expect(quarterFromMonth(10)).toBe(4);
  });

  test("buildMaintenanceScheduleRows monta 4 linhas e marcações", () => {
    const { rows } = buildMaintenanceScheduleRows({
      programs: [{
        id: "p1",
        equipment_kind: "pesos",
        issued_approved_by: "Guilherme",
        events: [
          { asset_label: "Conjuntos de Pesos Padrão", month: 2, status: "executado" },
          { asset_label: "Conjuntos de Pesos Padrão", month: 6, status: "planejado" },
        ],
      }],
    });
    expect(rows).toHaveLength(4);
    expect(rows[0].label).toBe(defaultAssetLabel("pesos"));
    expect(rows[0].marks[2]).toBe("executado");
    expect(rows[0].marks[6]).toBe("planejado");
    expect(rows[1].label).toContain("Thermo");
  });
});
