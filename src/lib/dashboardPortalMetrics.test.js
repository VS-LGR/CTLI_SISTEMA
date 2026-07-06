import {
  DASHBOARD_CERTIFICATE_STATUSES,
  buildEquipmentExpiryAlerts,
  buildMonthlyEmissions,
  classifyEquipmentExpiry,
  countFromSupabaseHead,
} from "./dashboardPortalMetrics";

describe("dashboardPortalMetrics", () => {
  test("DASHBOARD_CERTIFICATE_STATUSES inclui aprovado, emitido e enviado", () => {
    expect(DASHBOARD_CERTIFICATE_STATUSES).toEqual(["aprovado", "emitido", "enviado"]);
  });

  test("countFromSupabaseHead devolve count ou lança erro", () => {
    expect(countFromSupabaseHead({ count: 3, error: null })).toBe(3);
    expect(countFromSupabaseHead({ count: null, error: null })).toBe(0);
    expect(() => countFromSupabaseHead({ count: null, error: { message: "fail" } })).toThrow();
  });

  test("classifyEquipmentExpiry distingue vencido e aviso", () => {
    expect(classifyEquipmentExpiry("2020-01-01", "2026-06-29")).toBe("expired");
    expect(classifyEquipmentExpiry("2026-07-15", "2026-06-29", 60)).toBe("warning");
    expect(classifyEquipmentExpiry("2027-01-01", "2026-06-29")).toBe(null);
  });

  test("buildEquipmentExpiryAlerts agrega pesos e termo", () => {
    const alerts = buildEquipmentExpiryAlerts(
      [{ id: "w1", set_name: "RF-11", expiry_date: "2020-01-01" }],
      [{ id: "e1", equipment_name: "TBH-1", expiry_date: "2026-07-01" }],
      "2026-06-29",
    );
    expect(alerts).toHaveLength(2);
    expect(alerts[0].status).toBe("expired");
    expect(alerts[1].status).toBe("warning");
  });

  test("buildMonthlyEmissions agrega por mês e total", () => {
    const year = 2026;
    const result = buildMonthlyEmissions(
      year,
      [{ proposal_date: "2026-01-15" }, { proposal_date: "2026-01-20" }],
      [{ issue_date: "2026-03-01" }],
      [{ calibration_date: "2026-03-10" }, { created_at: "2026-06-01T10:00:00Z" }],
    );
    expect(result.year).toBe(2026);
    expect(result.months[0].proposals).toBe(2);
    expect(result.months[2].certificates).toBe(1);
    expect(result.months[2].coletas).toBe(1);
    expect(result.months[5].coletas).toBe(1);
    expect(result.totals.proposals).toBe(2);
    expect(result.totals.certificates).toBe(1);
    expect(result.totals.coletas).toBe(2);
  });
});
