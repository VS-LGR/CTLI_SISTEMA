import {
  DASHBOARD_CERTIFICATE_STATUSES,
  buildEquipmentExpiryAlerts,
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
});
