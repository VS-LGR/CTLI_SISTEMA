/**
 * Auditoria Matriz (2) — fixture extraído + Validação golden.
 */
import audit from "./__fixtures__/xlsm-matriz2-audit.json";
import golden from "./__fixtures__/xlsm-golden.json";
import { calculateCertificatePoints, buildCertificatePointDisplay } from "./index";

describe("xlsm Matriz (2) audit fixture", () => {
  test("fixture contém certificados extraídos", () => {
    expect(audit.source).toMatch(/Matriz \(2\)/);
    expect(audit.certificates.length).toBeGreaterThanOrEqual(5);
  });

  test("Validação 2025 P1 — display alinha com Matriz (2)", () => {
    const auditCert = audit.certificates.find((c) => c.name === "Validação 2025");
    const goldenCase = golden.cases.find((c) => c.id === "validacao-2025-210g");
    expect(auditCert).toBeTruthy();
    expect(goldenCase).toBeTruthy();

    const auditP1 = auditCert.points.find((p) => p.calc.point_number === 1);
    expect(auditP1.display.expanded_uncertainty).toBeCloseTo(0.0007, 4);

    const results = calculateCertificatePoints(
      goldenCase.points,
      goldenCase.balance,
      goldenCase.weightItems,
      goldenCase.weightCerts,
      goldenCase.environmental,
    );
    const display = buildCertificatePointDisplay(results[0], goldenCase.balance, "g");
    expect(display.expandedUncertainty).toBeCloseTo(auditP1.display.expanded_uncertainty, 4);
  });

  test("todos os pontos sem lote na planilha (AN=não)", () => {
    audit.certificates.forEach((cert) => {
      cert.points.forEach((pt) => {
        expect(pt.calc.use_load_batch).toBe(false);
      });
    });
  });

  test("002/2025 P1 — uc e Ue extraídos", () => {
    const cert = audit.certificates.find((c) => c.name === "002/2025");
    const p1 = cert.points.find((p) => p.calc.point_number === 1);
    expect(p1.calc.combined_uncertainty).toBeCloseTo(0.0000445, 5);
    expect(p1.display.expanded_uncertainty).toBeCloseTo(0.0002, 4);
  });

  test("003/2025 P2 — display extraído da planilha", () => {
    const cert = audit.certificates.find((c) => c.name === "003/2025");
    const p2 = cert.points.find((p) => p.calc.point_number === 2);
    expect(p2.calc.combined_uncertainty).toBeCloseTo(0.00497, 4);
    expect(p2.display.expanded_uncertainty).toBeCloseTo(0.0116, 3);
  });
});
