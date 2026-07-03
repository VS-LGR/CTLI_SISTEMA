import {
  balanceSnapshotFromScaleRegistration,
  buildScaleRegistrationFromBalance,
  omitPointMaxToleranceFormKeys,
  loadMaxTolerancesFromForm,
  countScaleRanges,
  formatScaleRangesSummary,
} from "./scaleRegistrationUtils";

describe("buildScaleRegistrationFromBalance", () => {
  it("mapeia payload.balanca para scale_registrations", () => {
    const payload = buildScaleRegistrationFromBalance({
      tenantId: "t1",
      endCustomerId: "c1",
      balanca: {
        serie: "SN-99",
        tag: "AP-2000",
        fabricante: "TOLEDO",
        modelo: "2099",
        local: "Expedição",
        capacidade: "300",
        resolucao: "0,0001",
        divisao_verificacao: "0,0001",
        unidade: "g",
        tipo_balanca: "industrial",
        tipo_plataforma: "quadrada",
        etiqueta_ipem: "123456-7",
      },
      legalMetrology: true,
    });

    expect(payload.tenant_id).toBe("t1");
    expect(payload.end_customer_id).toBe("c1");
    expect(payload.serial_number).toBe("SN-99");
    expect(payload.tag).toBe("AP-2000");
    expect(payload.resolution_1).toBe("0,0001");
    expect(payload.decimal_places_p1).toBe(4);
    expect(payload.portaria_inmetro).toBe("Portaria INMETRO nº 157/2022");
  });

  it("roundtrip com balanceSnapshotFromScaleRegistration", () => {
    const scale = buildScaleRegistrationFromBalance({
      tenantId: "t1",
      endCustomerId: "c1",
      balanca: {
        serie: "ABC",
        fabricante: "X",
        modelo: "Y",
        capacidade: "100",
        resolucao: "0,05",
        unidade: "kg",
        tipo_plataforma: "redonda",
        point_max_tolerances: [
          { nominal_value: "300", unit: "kg", max_tolerance: "0,6" },
        ],
      },
    });
    const snap = balanceSnapshotFromScaleRegistration(scale);
    expect(snap.serie).toBe("ABC");
    expect(snap.capacidade).toBe("100");
    expect(snap.tipo_plataforma).toBe("redonda");
    expect(snap.decimal_places.p1).toBe(2);
    expect(snap.point_max_tolerances[0].nominal_value).toBe("300");
  });

  it("mapeia múltiplas faixas de indicação", () => {
    const scale = buildScaleRegistrationFromBalance({
      tenantId: "t1",
      endCustomerId: "c1",
      balanca: {
        serie: "MULTI",
        fabricante: "X",
        modelo: "Y",
        capacidade: "5",
        resolucao: "0,005",
        capacidade_2: "10",
        resolucao_2: "0,01",
        capacidade_3: "30",
        resolucao_3: "0,1",
        unidade: "kg",
      },
    });
    expect(scale.capacity_2).toBe("10");
    expect(scale.resolution_3).toBe("0,1");
    const snap = balanceSnapshotFromScaleRegistration(scale);
    expect(snap.capacidade_2).toBe("10");
    expect(snap.resolucao_3).toBe("0,1");
    expect(countScaleRanges(scale)).toBe(3);
    expect(formatScaleRangesSummary(snap)).toContain("até 10 kg");
  });

  it("preserva unidade mg no cadastro e snapshot", () => {
    const scale = buildScaleRegistrationFromBalance({
      tenantId: "t1",
      endCustomerId: "c1",
      balanca: {
        serie: "MG-1",
        capacidade: "500",
        resolucao: "0,1",
        unidade: "mg",
        point_max_tolerances: [
          { nominal_value: "200", max_tolerance: "0,3" },
        ],
      },
    });
    expect(scale.unit).toBe("mg");
    expect(scale.point_max_tolerances[0].unit).toBe("mg");
    const snap = balanceSnapshotFromScaleRegistration(scale);
    expect(snap.unidade).toBe("mg");
    expect(formatScaleRangesSummary(snap)).toContain("até 500 mg");
  });
});

describe("loadMaxTolerancesFromForm", () => {
  it("persiste tolerâncias por pesagem", () => {
    const rows = [
      { nominal_value: "300", unit: "kg", max_tolerance: "0,6" },
      { nominal_value: "", unit: "kg", max_tolerance: "" },
    ];
    expect(loadMaxTolerancesFromForm(rows, "kg")).toEqual([
      { nominal_value: "300", unit: "kg", max_tolerance: "0,6" },
    ]);
    const cleaned = omitPointMaxToleranceFormKeys({
      serial_number: "SN-1",
      point_max_tolerances: rows,
    });
    expect(cleaned).toEqual({ serial_number: "SN-1" });
  });
});
