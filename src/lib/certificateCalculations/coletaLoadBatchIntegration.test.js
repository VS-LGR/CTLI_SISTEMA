import { buildCertificateFromPayload } from "@/lib/calibrationCertificates/buildCertificatePayload";
import { calculateCertificatePoints } from "./index";

describe("coleta → certificado — lote de carga", () => {
  test("importa verso e aplica flags em P2+", () => {
    const payload = {
      cliente: { cliente: "Teste" },
      balanca: { serie: "SN1", unidade: "g", capacidade: "220", resolucao: "0.0001" },
      controle: { data_calibracao: "2025-06-01" },
      calibracao: {
        pontos: [
          {
            peso_nominal: "20",
            rep1: "20.0001",
            rep2: "20.0001",
            rep3: "20.0001",
          },
          {
            peso_nominal: "210",
            rep1: "210.0001",
            rep2: "210.0001",
            rep3: "210.0001",
          },
        ],
      },
      verso: {
        repetitividade: {
          aplicavel: true,
          linhas: [
            { key: "p1", label: "P1*", leitura1: "20.0001", leitura2: "20.0001", leitura3: "20.0001" },
            { key: "l1_p1", label: "L1 + P1", valor_nominal: "190", leitura1: "210.0001" },
          ],
        },
      },
    };

    const built = buildCertificateFromPayload({ payload });
    expect(built.points[1].use_load_batch).toBe(true);
    expect(built.points[1].load_batch_formation).toBe("l1_p1");
    expect(built.certificate.repeatability_snapshot.linhas.length).toBeGreaterThan(0);

    const calculated = calculateCertificatePoints(
      built.points,
      built.certificate.balance_snapshot,
      [],
      [],
      built.environmental,
      { repeatabilitySnapshot: built.certificate.repeatability_snapshot },
    );

    expect(calculated[0].calc_status).toBe("calculado");
    expect(calculated[1].calc_status).toBe("calculado");
    expect(calculated[1].calculation_memory.upLC).toBeGreaterThan(0);
  });
});
