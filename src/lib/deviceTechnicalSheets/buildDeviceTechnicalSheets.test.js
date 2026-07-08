import {
  buildDeviceTechnicalSheets,
  deriveDeviceSheetStatus,
  filterDeviceTechnicalSheets,
} from "./buildDeviceTechnicalSheets";

describe("buildDeviceTechnicalSheets", () => {
  test("deriveDeviceSheetStatus", () => {
    expect(deriveDeviceSheetStatus({ active: false, expiryDate: "2030-01-01", today: "2026-07-08" })).toBe("INATIVO");
    expect(deriveDeviceSheetStatus({ active: true, expiryDate: "2025-01-01", today: "2026-07-08" })).toBe("VENCIDO");
    expect(deriveDeviceSheetStatus({ active: true, expiryDate: "2027-01-01", today: "2026-07-08" })).toBe("APROVADO");
    expect(deriveDeviceSheetStatus({ active: true, expiryDate: null, today: "2026-07-08" })).toBe("A_VERIFICAR");
  });

  test("agrega peso e thermo em linhas", () => {
    const rows = buildDeviceTechnicalSheets({
      today: "2026-07-08",
      weightItems: [{
        id: "w1",
        identification: "MA-01",
        nominal_value: "1000",
        conventional_value: "1000,1",
        expanded_uncertainty: "0,1",
        unit: "g",
        active: true,
        weight_certificate_id: "c1",
        certificate_number: "",
        weight_status: "1",
      }],
      weightCertificates: [{
        id: "c1",
        manufacturer: "Kn",
        certificate_number: "CAL-1",
        calibrated_by: "CAL 0056",
        calibration_date: "2024-01-10",
        expiry_date: "2026-01-10",
        class: "M1",
        intermediate_check_label: "jan-25",
      }],
      envCertificates: [{
        id: "e1",
        equipment_name: "BRM-97",
        equipment_type: "barometro",
        manufacturer: "Instrutemp",
        certificate_number: "TBH-1",
        calibrated_by: "LAB",
        calibration_date: "2024-06-01",
        expiry_date: "2026-06-01",
      }],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].equipmentType).toBe("Peso Padrão");
    expect(rows[0].quantity).toBe("MASSA");
    expect(rows[0].status).toBe("VENCIDO");
    expect(rows[1].quantity).toBe("PRESSÃO");
    expect(rows[1].equipmentType).toMatch(/Barômetro/);
  });

  test("filterDeviceTechnicalSheets por situação e query", () => {
    const rows = [
      { identification: "A", status: "APROVADO", equipmentType: "Peso Padrão", quantity: "MASSA", manufacturer: "X", certificateNumber: "1", location: "", calibrationDate: "2024-01-01" },
      { identification: "B", status: "VENCIDO", equipmentType: "Barômetro", quantity: "PRESSÃO", manufacturer: "Y", certificateNumber: "2", location: "", calibrationDate: "2023-01-01" },
    ];
    expect(filterDeviceTechnicalSheets(rows, { status: "VENCIDO" })).toHaveLength(1);
    expect(filterDeviceTechnicalSheets(rows, { query: "bar" })).toHaveLength(1);
  });
});
