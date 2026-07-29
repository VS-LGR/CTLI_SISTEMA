import {
  buildDeviceTechnicalSheets,
  computeWeightSheetMetrology,
  deriveDeviceSheetStatus,
  filterDeviceTechnicalSheets,
} from "./buildDeviceTechnicalSheets";
import {
  classifyWeightClassFromUncertainty,
  expandedUncertaintyToMg,
} from "@/lib/weightCalibrationCalculations/oimlTables";

describe("buildDeviceTechnicalSheets", () => {
  test("deriveDeviceSheetStatus", () => {
    expect(deriveDeviceSheetStatus({ active: false, expiryDate: "2030-01-01", today: "2026-07-08" })).toBe("INATIVO");
    expect(deriveDeviceSheetStatus({ active: true, expiryDate: "2025-01-01", today: "2026-07-08" })).toBe("VENCIDO");
    expect(deriveDeviceSheetStatus({ active: true, expiryDate: "2027-01-01", today: "2026-07-08" })).toBe("APROVADO");
    expect(deriveDeviceSheetStatus({ active: true, expiryDate: null, today: "2026-07-08" })).toBe("A_VERIFICAR");
  });

  test("classifyWeightClassFromUncertainty — Excel E1→M3 por Ue ≤ δm/3", () => {
    expect(expandedUncertaintyToMg(0.2, "g")).toBe(200);
    // 10 kg (10000 g), Ue=0,2 g → U=200 mg → classe M2 (δm M1/3≈166,7; M2/3≈533)
    expect(classifyWeightClassFromUncertainty(10000, 0.2, "g").className).toBe("M2");
    // 1 g, Ue=0,000033 g → U=0,033 mg → F1 (δm F1/3≈0,0333)
    expect(classifyWeightClassFromUncertainty(1, 0.000033, "g").className).toBe("F1");
  });

  test("computeWeightSheetMetrology preenche EP, Ue máx e V.C. min/máx", () => {
    const metro = computeWeightSheetMetrology({
      nominalRaw: "10000",
      conventionalRaw: "10000",
      uncertaintyRaw: "0,2",
      unit: "g",
    });
    expect(metro.className).toBe("M2");
    expect(metro.maxError).not.toBe("N/A");
    expect(metro.maxUncertainty).not.toBe("N/A");
    expect(metro.vcMin).not.toBe("N/A");
    expect(metro.vcMax).not.toBe("N/A");
    expect(metro.withinTolerance).toBe(true);
    // EP M2 10000 g = 1600 mg = 1,6 g; V.C. min = 10000 − (1,6 − 0,2) = 9986,6
    expect(metro.epInUnit).toBeCloseTo(1.6, 6);
    const vcMinNum = Number(String(metro.vcMin).replace(",", "."));
    expect(vcMinNum).toBeCloseTo(10000 - (1.6 - 0.2), 4);
  });

  test("agrega peso e thermo em linhas com colunas RE-6.4B", () => {
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
    expect(rows[0].equipmentClass).toBeTruthy();
    expect(rows[0].maxError).not.toBe("N/A");
    expect(rows[0].maxUncertainty).not.toBe("N/A");
    expect(rows[0].vcMin).not.toBe("N/A");
    expect(rows[0].maintenancePlan).toBe("RE-6.4.12A");
    expect(rows[1].quantity).toBe("PRESSÃO");
    expect(rows[1].equipmentType).toMatch(/Barômetro/);
  });

  test("exclui lote de carga, calcula erro e classifica por Ue", () => {
    const rows = buildDeviceTechnicalSheets({
      today: "2026-07-08",
      weightItems: [
        {
          id: "w1",
          identification: "MA-01",
          nominal_value: "1",
          conventional_value: "0,999959",
          expanded_uncertainty: "0,000033",
          unit: "g",
          active: true,
          weight_certificate_id: "c1",
          weight_status: "4",
          is_load_batch: false,
        },
        {
          id: "lb1",
          identification: "L-190",
          nominal_value: "190",
          conventional_value: "190",
          expanded_uncertainty: "0,1",
          unit: "g",
          active: true,
          is_load_batch: true,
        },
      ],
      weightCertificates: [{
        id: "c1",
        manufacturer: "Kn",
        certificate_number: "CAL-1",
        calibrated_by: "CAL 0056",
        calibration_date: "2024-01-10",
        expiry_date: "2026-01-10",
        class: "M1",
      }],
      envCertificates: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].equipmentType).toBe("Peso Padrão");
    expect(rows[0].history).toBe("4ª Calibração");
    expect(rows[0].errorFound).not.toBe("N/A");
    expect(rows[0].equipmentClass).toBe("F1");
  });

  test("filterDeviceTechnicalSheets por situação REPROVADO", () => {
    const rows = buildDeviceTechnicalSheets({
      today: "2026-01-01",
      weightItems: [{
        id: "w1",
        identification: "X",
        nominal_value: "1",
        conventional_value: "2",
        expanded_uncertainty: "0,000033",
        unit: "g",
        active: true,
        weight_certificate_id: "c1",
        weight_status: "1",
      }],
      weightCertificates: [{
        id: "c1",
        certificate_number: "C",
        calibration_date: "2024-01-10",
        expiry_date: "2026-01-10",
        calibrated_by: "L",
        manufacturer: "M",
      }],
    });
    expect(rows[0].status).toBe("REPROVADO");
    expect(filterDeviceTechnicalSheets(rows, { status: "REPROVADO" })).toHaveLength(1);
  });
});
