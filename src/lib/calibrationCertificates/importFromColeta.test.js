import { buildCertificateFromPayload } from "./buildCertificatePayload";
import { buildImportFromColeta } from "./importFromColeta";
import { emptyColetaPayload } from "@/lib/coletaSchema";

describe("buildImportFromColeta", () => {
  it("não lança com payload mínimo de coleta", () => {
    const payload = emptyColetaPayload();
    payload.cliente.cliente = "Cliente Teste";
    payload.balanca.serie = "SN-001";
    payload.controle.data_calibracao = "2026-06-15";
    payload.controle.nome_executor = "Executor";

    const result = buildImportFromColeta({
      collectionRow: {
        id: "coll-1",
        workflow_status: "rascunho",
        payload,
        client_name: "Cliente Teste",
        scale_serial: "SN-001",
        calibration_date: "2026-06-15",
      },
      certificateType: "rastreavel",
      certificateYear: 2026,
      certificateNumber: 1,
    });

    expect(result.certificate.collection_id).toBe("coll-1");
    expect(result.certificate.client_name).toBe("Cliente Teste");
    expect(result.certificate.is_preview_only).toBe(true);
    expect(result.points).toHaveLength(10);
  });

  it("marca prévia como false quando coleta está conferida", () => {
    const payload = emptyColetaPayload();
    const result = buildImportFromColeta({
      collectionRow: {
        id: "coll-2",
        workflow_status: "conferida",
        payload,
      },
      certificateType: "rbc",
      certificateYear: 2026,
      certificateNumber: 2,
    });

    expect(result.certificate.is_preview_only).toBe(false);
  });
});

describe("buildCertificateFromPayload", () => {
  it("cria certificado manual sem collection_id", () => {
    const payload = emptyColetaPayload();
    payload.cliente.cliente = "Manual Cliente";
    payload.balanca.serie = "MAN-999";
    payload.controle.data_calibracao = "2026-06-15";
    payload.calibracao.pontos[0] = {
      ...payload.calibracao.pontos[0],
      peso_nominal: "100 g",
      rep1: "100.01",
      rep2: "100.02",
      rep3: "100.03",
    };

    const result = buildCertificateFromPayload({
      payload,
      certificateType: "rastreavel",
      certificateYear: 2026,
      certificateNumber: 10,
      clientName: "Manual Cliente",
      scaleSerial: "MAN-999",
      calibrationDate: "2026-06-15",
      collectionId: null,
      collectionSnapshot: null,
      isPreviewOnly: false,
    });

    expect(result.certificate.collection_id).toBeNull();
    expect(result.certificate.is_preview_only).toBe(false);
    expect(result.certificate.client_name).toBe("Manual Cliente");
    expect(result.points[0].nominal_value).toBe("100 g");
    expect(result.points[0].reading1).toBe("100.01");
  });
});
