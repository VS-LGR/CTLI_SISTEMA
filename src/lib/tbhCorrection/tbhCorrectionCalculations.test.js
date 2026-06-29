import {
  applyTbhCorrectionToAmbiente,
  buildRegressionFromPoints,
  correctDeviceReading,
  formatTbhCorrectedValue,
  getEnabledQuantities,
} from "./tbhCorrectionCalculations";

const TEMP_POINTS = [
  { device: 15, supplier: 15 },
  { device: 20.3, supplier: 20 },
  { device: 24.9, supplier: 25 },
  { device: 29.9, supplier: 30 },
  { device: 34.9, supplier: 35 },
];

const HUMIDITY_POINTS = [
  { device: 29, supplier: 30 },
  { device: 41, supplier: 40 },
  { device: 49, supplier: 50 },
  { device: 56, supplier: 60 },
  { device: 66, supplier: 70 },
];

const PRESSURE_POINTS = [
  { device: 960, supplier: 956.25 },
  { device: 970, supplier: 968 },
  { device: 980, supplier: 978.9 },
  { device: 990, supplier: 989.35 },
  { device: 1000, supplier: 998.9 },
  { device: 1010, supplier: 1008.8 },
];

describe("tbhCorrectionCalculations", () => {
  test("temperatura — inclinação e intercepção RE-6.4E", () => {
    const reg = buildRegressionFromPoints(TEMP_POINTS);
    expect(reg.valid).toBe(true);
    expect(reg.slope).toBeCloseTo(1.01179748, 6);
    expect(reg.intercept).toBeCloseTo(-0.29493692, 6);
  });

  test("umidade — inclinação e intercepção RE-6.4E", () => {
    const reg = buildRegressionFromPoints(HUMIDITY_POINTS);
    expect(reg.valid).toBe(true);
    expect(reg.slope).toBeCloseTo(1.11417126, 6);
    expect(reg.intercept).toBeCloseTo(-3.70305458, 6);
    expect(correctDeviceReading(44, reg.slope, reg.intercept)).toBeCloseTo(45.3, 1);
  });

  test("pressão — inclinação e intercepção RE-6.4E", () => {
    const reg = buildRegressionFromPoints(PRESSURE_POINTS);
    expect(reg.valid).toBe(true);
    expect(reg.slope).toBeCloseTo(1.04542857, 6);
    expect(reg.intercept).toBeCloseTo(-46.3804762, 6);
    expect(correctDeviceReading(920, reg.slope, reg.intercept)).toBeCloseTo(915.4, 1);
  });

  test("formatTbhCorrectedValue usa vírgula decimal", () => {
    expect(formatTbhCorrectedValue(45.32, "humidity")).toBe("45,3");
  });

  test("getEnabledQuantities por tipo de equipamento", () => {
    expect(getEnabledQuantities("barometro").map((q) => q.key)).toEqual(["pressure"]);
    expect(getEnabledQuantities("termo_higrometro").map((q) => q.key)).toEqual(["temperature", "humidity"]);
  });

  test("applyTbhCorrectionToAmbiente — um TBH corrige ini e fin", () => {
    const envCert = {
      id: "cert-1",
      equipment_name: "TBH A",
      equipment_type: "thermo_baro_higrometro",
      tbh_correction_calibration: {
        temperature: { points: TEMP_POINTS },
        humidity: { points: HUMIDITY_POINTS },
        pressure: { points: PRESSURE_POINTS },
      },
    };
    const ambiente = {
      thermo_cert_id: "cert-1",
      temp_inicial: "20,3",
      temp_final: "29,9",
      umidade_inicial: "44",
      umidade_final: "44",
      pressao_inicial: "920",
      pressao_final: "920",
    };
    const result = applyTbhCorrectionToAmbiente(ambiente, envCert);
    expect(result.ok).toBe(true);
    expect(result.updated.temp_inicial).toBe("20,2");
    expect(result.updated.temp_final).toBe("30,0");
    expect(result.updated.umidade_inicial).toBe("45,3");
    expect(result.updated.tbh_correction_applied).toBe(true);
    expect(result.updated.tbh_correction_raw.temp_inicial).toBe("20,3");
  });

  test("applyTbhCorrectionToAmbiente — dois TBH separados", () => {
    const cert1 = {
      id: "c1",
      equipment_name: "TBH 1",
      equipment_type: "thermo_baro_higrometro",
      tbh_correction_calibration: { temperature: { points: TEMP_POINTS } },
    };
    const cert2 = {
      id: "c2",
      equipment_name: "TBH 2",
      equipment_type: "thermo_baro_higrometro",
      tbh_correction_calibration: {
        temperature: { points: TEMP_POINTS },
      },
    };
    const ambiente = {
      thermo_cert_id: "c1",
      thermo_cert_id_2: "c2",
      temp_inicial: "20,3",
      temp_final: "29,9",
    };
    const result = applyTbhCorrectionToAmbiente(ambiente, cert1, cert2);
    expect(result.ok).toBe(true);
    expect(result.updated.temp_inicial).toBe("20,2");
    expect(result.byEquipment).toHaveLength(2);
  });
});
