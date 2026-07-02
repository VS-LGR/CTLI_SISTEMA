import { buildCertificateFromPayload } from "./buildCertificatePayload";
import { calculateCertificatePoints } from "@/lib/certificateCalculations";
import {
  coletaPointToPanelPoint,
  syncColetaPontosFromRepeatability,
} from "./certificatePointUtils";

describe("certificado manual — lote de carga integração", () => {
  const basePayload = {
    cliente: { cliente: "Manual" },
    balanca: { serie: "M1", unidade: "g", capacidade: "220", resolucao: "0.001" },
    controle: { data_calibracao: "2025-06-01" },
    calibracao: {
      pontos: [
        { peso_nominal: "20", rep1: "20.001", rep2: "20.001", rep3: "20.001" },
        { peso_nominal: "210", rep1: "210.001", rep2: "210.001", rep3: "210.001" },
        { peso_nominal: "220", rep1: "220.001", rep2: "220.001", rep3: "220.001" },
      ],
    },
    verso: {
      repetitividade: {
        aplicavel: true,
        linhas: [
          { key: "p1", leitura1: "20.001", leitura2: "20.001", leitura3: "20.001" },
          { key: "l1_p1", valor_nominal: "190", leitura1: "210.001" },
          { key: "l2_p1", valor_nominal: "10", leitura1: "220.001", formation_uc: 0.05 },
        ],
      },
    },
  };

  test("verso sincroniza checkbox lote em P2 no painel", () => {
    const pontos = syncColetaPontosFromRepeatability(
      basePayload.calibracao.pontos,
      basePayload.verso.repetitividade,
      basePayload.balanca,
    );
    const p2 = coletaPointToPanelPoint(pontos[1], 2, basePayload.balanca);
    expect(p2.use_load_batch).toBe(true);
    expect(p2.load_batch_nominal).toBe("190");
  });

  test("payload manual com flags explícitos em P2 cria certificado com lote", () => {
    const payload = {
      ...basePayload,
      calibracao: {
        pontos: [
          basePayload.calibracao.pontos[0],
          {
            ...basePayload.calibracao.pontos[1],
            use_load_batch: true,
            load_batch_formation: "l1_p1",
            load_batch_nominal: "190",
            load_batch_material_preset: "aco",
          },
          basePayload.calibracao.pontos[2],
        ],
      },
    };
    const built = buildCertificateFromPayload({ payload });
    expect(built.points[1].use_load_batch).toBe(true);
    expect(built.points[1].load_batch_formation).toBe("l1_p1");

    const calculated = calculateCertificatePoints(
      built.points,
      built.certificate.balance_snapshot,
      [],
      [],
      built.environmental,
      { repeatabilitySnapshot: built.certificate.repeatability_snapshot },
    );
    expect(calculated[1].calculation_memory.upLC).toBeGreaterThan(0);
  });

  test("P3 com l2_p1 usa formation_uc do verso na cadeia", () => {
    const payload = {
      ...basePayload,
      calibracao: {
        pontos: basePayload.calibracao.pontos.map((pt, i) => {
          const n = i + 1;
          if (n === 2) {
            return {
              ...pt,
              use_load_batch: true,
              load_batch_formation: "l1_p1",
              load_batch_nominal: "190",
            };
          }
          if (n === 3) {
            return {
              ...pt,
              use_load_batch: true,
              load_batch_formation: "l2_p1",
              load_batch_nominal: "10",
            };
          }
          return pt;
        }),
      },
    };
    const built = buildCertificateFromPayload({ payload });
    const calculated = calculateCertificatePoints(
      built.points,
      built.certificate.balance_snapshot,
      [],
      [],
      built.environmental,
      { repeatabilitySnapshot: built.certificate.repeatability_snapshot },
    );
    expect(calculated[2].calculation_memory.upLC).toBeGreaterThan(0);
    expect(calculated[2].calculation_memory.upLcSource).toBe("l1_p1");
  });
});
