import {
  balanceSnapshotFromScaleRegistration,
  buildScaleRegistrationFromBalance,
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
    expect(payload.portaria_inmetro).toBe("aplicável");
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
      },
    });
    const snap = balanceSnapshotFromScaleRegistration(scale);
    expect(snap.serie).toBe("ABC");
    expect(snap.capacidade).toBe("100");
    expect(snap.tipo_plataforma).toBe("redonda");
    expect(snap.decimal_places.p1).toBe(2);
  });
});
