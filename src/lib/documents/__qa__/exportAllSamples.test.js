/**
 * @jest-environment node
 *
 * Amostras de todas as exportações PDF para revisão visual.
 * Saída: <raiz>/pdf-verificacao/amostras/
 */
import { TextEncoder, TextDecoder } from "util";
import fs from "fs";
import path from "path";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock("sonner", () => ({
  toast: { warning() {}, success() {}, error() {}, info() {} },
}));

jest.mock("@/lib/masterDocuments/masterDocumentExportHelper", () => ({
  prepareMasterDocumentExport: jest.fn(async ({ code, defaultTitle }) => ({
    meta: {
      id: null,
      code,
      title: defaultTitle,
      reference: String(code).startsWith("RE-6.4.12") ? "PR-6.4.12" : "PR-6.4",
      revision: "00",
      modelIssueDate: "2025-06-30",
    },
    fileName: `${code}-amostra.pdf`,
  })),
  recordMasterDocumentExport: jest.fn(async () => {}),
}));

const OUT_DIR = path.resolve(process.cwd(), "pdf-verificacao", "amostras");

function logoDataUrl() {
  const file = path.resolve(process.cwd(), "public/Logo_QUATI.png");
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

function pdfNames(dir) {
  if (!fs.existsSync(dir)) return new Set();
  return new Set(fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".pdf")));
}

function writeDoc(doc, fileName) {
  fs.writeFileSync(path.join(OUT_DIR, fileName), Buffer.from(doc.output("arraybuffer")));
}

async function captureSaved(fileName, run) {
  const before = pdfNames(process.cwd());
  const result = await run();
  if (result && typeof result.output === "function") {
    writeDoc(result, fileName);
    return;
  }
  const created = fs.readdirSync(process.cwd()).filter((name) => name.toLowerCase().endsWith(".pdf") && !before.has(name));
  if (!created.length) throw new Error(`Nenhum PDF gerado para ${fileName}`);
  const newest = created
    .map((name) => ({ name, mtime: fs.statSync(path.join(process.cwd(), name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].name;
  fs.renameSync(path.join(process.cwd(), newest), path.join(OUT_DIR, fileName));
}

const LAB = {
  name: "Laboratório de verificação",
  legal_name: "Laboratório de verificação Ltda",
  billing_cnpj: "12.345.678/0001-90",
  billing_address: "Rua do Laboratório, 100",
  billing_city: "Belo Horizonte",
  billing_state: "MG",
  billing_phone: "(31) 3333-1000",
  billing_email: "lab@verificacao.example",
  lab_address: "Rua do Laboratório, 100",
  lab_phone: "(31) 3333-1000",
  ipem_accreditation_number: "IPEM-0000",
  ipem_number: "IPEM-0000",
};

const CONTROL = {
  elaboratedBy: "Ana Fantasma",
  verifiedBy: "Renata Oliveira",
  approvedBy: "Paulo Mendes",
};

const META = {
  coleta: { code: "RE-7.2A", reference: "PR-7.2", revision: "00", modelIssueDate: "2025-06-30", title: "COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA", ...CONTROL },
  proposta: { code: "RE-7.1A", reference: "PR-7.1", revision: "00", modelIssueDate: "2025-06-30", title: "PROPOSTA COMERCIAL", ...CONTROL },
  orcamento: { code: "RE-6.6C", reference: "PR-6.6", revision: "00", modelIssueDate: "2025-06-30", title: "SOLICITAÇÃO DE ORÇAMENTO" },
  pedido: { code: "RE-6.6D", reference: "PR-6.6", revision: "00", modelIssueDate: "2025-06-30", title: "PEDIDO DE COMPRA" },
  certBalanca: { code: "RE-7.2B", reference: "PR-7.2", revision: "00", modelIssueDate: "2025-06-30", title: "CERTIFICADO DE CALIBRAÇÃO", ...CONTROL },
  certPeso: { code: "RE-5.4.2B", reference: "PR-7.2", revision: "03", modelIssueDate: "2025-06-30", title: "CERTIFICADO DE CALIBRAÇÃO DE PESOS", ...CONTROL },
};

describe("Amostras de todas as exportações", () => {
  test("gera um PDF preenchido de cada família", async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const logo = logoDataUrl();
    const failures = [];

    async function run(name, fn) {
      try {
        await fn();
      } catch (error) {
        failures.push(`${name}: ${error?.message || error}`);
      }
    }

    await run("coleta", async () => {
      const { drawColetaPdf } = await import("@/lib/coletaPdf/drawColetaPdf");
      await captureSaved("04-coleta-balanca.pdf", () => drawColetaPdf({
        collection_number: 42,
        collection_year: 2026,
        commercial_proposal_ref: "PC-2026-018",
        payload: {
          cliente: { cliente: "Cliente Fantasma Ltda", cnpj: "45.678.901/0001-22", endereco: "Av. Industrial, 250", cidade: "Campinas", estado: "SP", responsavel: "Marina Costa", telefone: "(19) 98888-0000" },
          balanca: { fabricante: "Toledo", modelo: "2098", serie: "SN-88421", tag: "BL-12", capacidade: "30", resolucao: "0,001", unidade: "kg", tipo_balanca: "comercial", tipo_plataforma: "retangular_quadrada", local: "Área de pesagem" },
          ambiente: { horario_inicial: "09:30", horario_final: "11:10", temp_inicial: "23,1", temp_final: "23,4", umidade_inicial: "55", umidade_final: "57", pressao_inicial: "1013,2", pressao_final: "1012,8", balanca_ajustada: "sim", balanca_nivelada: "sim", existe_vibracao: "nao", existe_corrente_ar: "nao" },
          controle: { data_calibracao: "2026-10-08", nome_executor: "Ana Fantasma", representante_cliente: "Marina Costa" },
        },
      }, "Laboratório de verificação", { logoDataUrl: logo, documentMeta: META.coleta, tenant: LAB, fileName: "04-coleta-balanca.pdf" }));
    });

    await run("proposta", async () => {
      const { drawCommercialProposalPdf } = await import("@/lib/commercialProposalPdf/drawCommercialProposalPdf");
      await captureSaved("05-proposta-comercial.pdf", () => drawCommercialProposalPdf({
        proposal_number: 18,
        proposal_year: 2026,
        proposal_date: "2026-10-08",
        document_code: "RE-7.1A",
        document_reference: "PR-7.1",
        document_revision: "00",
        document_model_issue_date: "2025-06-30",
        client_snapshot: { company: "Cliente Fantasma Ltda", address: "Av. Industrial, 250", attention_to: "Marina Costa" },
        scales: [{ manufacturer: "Toledo", model: "2098", serial_number: "SN-88421", capacity: "30", resolution: "0,001", unit: "kg", unit_value: 450, calibration_points: [] }],
        weightItems: [],
      }, { logoDataUrl: logo, documentMeta: META.proposta, tenant: LAB, fileName: "05-proposta-comercial.pdf" }));
    });

    await run("orcamento", async () => {
      const { drawQuotationRequestPdf } = await import("@/lib/quotationRequestPdf/drawQuotationRequestPdf");
      await captureSaved("06-solicitacao-orcamento.pdf", () => {
        const doc = drawQuotationRequestPdf({
          request_number: 12,
          request_year: 2026,
          request_date: "2026-10-08",
          status: "rascunho",
          client_environment_data_snapshot: { legal_name: "Laboratório de verificação", cnpj: "12.345.678/0001-90" },
          supplier_data_snapshot: { company: "Fornecedor Fantasma", cnpj: "98.765.432/0001-10" },
          sent_by_data_snapshot: { name: "Ana Fantasma" },
          sections: [],
          items: [],
        }, { logoDataUrl: logo, documentMeta: META.orcamento });
        return doc;
      });
    });

    await run("pedido", async () => {
      const { drawPedidoCompraPdf } = await import("@/lib/pedidoCompraPdf/drawPedidoCompraPdf");
      await captureSaved("07-pedido-compra.pdf", () => drawPedidoCompraPdf({
        order_number: 7,
        order_year: 2026,
        order_date: "2026-10-08",
        status: "emitido",
        type: "compra_pesos",
        document_model_issue_date: "2025-06-30",
        supplier_data_snapshot: { company: "Fornecedor Fantasma", cnpj: "98.765.432/0001-10" },
        client_environment_data_snapshot: { legal_name: "Laboratório de verificação", cnpj: "12.345.678/0001-90" },
        items: [{ item_number: 1, description: "Peso padrão 5 kg", quantity: 1, unit_value: 320 }],
        signatures: [],
      }, { logoDataUrl: logo, documentMeta: META.pedido }));
    });

    await run("pessoal", async () => {
      const { PERSONNEL_DOC_DEFAULTS } = await import("@/lib/personnelDocMeta");
      const { drawCompetencyPdf } = await import("@/lib/personnelPdf/drawCompetencyPdf");
      const { drawAdequacyPdf } = await import("@/lib/personnelPdf/drawAdequacyPdf");
      const { drawMonitoringPdf } = await import("@/lib/personnelPdf/drawMonitoringPdf");
      const { drawExperienceEvaluationPdf } = await import("@/lib/personnelPdf/drawExperienceEvaluationPdf");
      const { drawPersonnelSelectionPdf } = await import("@/lib/personnelPdf/drawPersonnelSelectionPdf");
      const { drawAttendanceListPdf } = await import("@/lib/personnelPdf/drawAttendanceListPdf");
      const person = {
        occupant_name: "Ana Fantasma",
        position_title: "Técnico de calibração",
        title: "Técnico de calibração",
        registration_number: "104",
        admission_date: "2026-03-02",
        inclusion_date: "2026-03-02",
        required_education: "Técnico em mecânica",
        function_activities: "Executar calibração de balanças e pesos.",
        analysis_approval_responsible_name: "Renata Oliveira",
        employee_name: "Ana Fantasma",
        course_name: "Incerteza de medição",
        training_date: "2026-09-15",
        participants: [{ name: "Ana Fantasma" }],
      };
      await captureSaved("08-competencia.pdf", () => drawCompetencyPdf(person, { logoDataUrl: logo, documentMeta: PERSONNEL_DOC_DEFAULTS.competency, fileName: "08-competencia.pdf" }));
      await captureSaved("09-adequacao.pdf", () => drawAdequacyPdf(person, { logoDataUrl: logo, documentMeta: PERSONNEL_DOC_DEFAULTS.adequacy, fileName: "09-adequacao.pdf" }));
      await captureSaved("10-monitoramento.pdf", () => drawMonitoringPdf(person, { logoDataUrl: logo, documentMeta: PERSONNEL_DOC_DEFAULTS.monitoring, fileName: "10-monitoramento.pdf" }));
      await captureSaved("11-experiencia.pdf", () => drawExperienceEvaluationPdf({ ...person, period_start: "2026-03-02", period_end: "2026-06-02", scores: [] }, { logoDataUrl: logo, documentMeta: PERSONNEL_DOC_DEFAULTS.experienceEvaluation, fileName: "11-experiencia.pdf" }));
      await captureSaved("12-selecao.pdf", () => drawPersonnelSelectionPdf(person, { logoDataUrl: logo, documentMeta: PERSONNEL_DOC_DEFAULTS.personnelSelection, fileName: "12-selecao.pdf" }));
      await captureSaved("13-presenca.pdf", () => drawAttendanceListPdf(person, { logoDataUrl: logo, documentMeta: PERSONNEL_DOC_DEFAULTS.attendanceList, fileName: "13-presenca.pdf" }));
    });

    await run("certificado-balanca", async () => {
      const { jsPDF } = await import("jspdf");
      const { buildCertificatePdfViewModel } = await import("@/lib/certificatePdf/viewModel");
      const { drawCertificatePdf } = await import("@/lib/certificatePdf/drawCertificatePdf");
      const model = buildCertificatePdfViewModel({
        certificate_type: "rastreavel",
        certificate_number: 42,
        certificate_year: 2026,
        calibration_date: "2026-10-08",
        client_name: "Cliente Fantasma Ltda",
        scale_serial: "SN-88421",
        proposal_ref: "PC-2026-018",
        balance_snapshot: { fabricante: "Toledo", modelo: "2098", serie: "SN-88421", capacidade: "30", resolucao: "0,001", unidade: "kg", tipo_balanca: "comercial", tag: "BL-12" },
        environmental: { initial_temperature: "23,1", final_temperature: "23,4", initial_humidity: "55", final_humidity: "57", initial_pressure: "1013", final_pressure: "1012" },
        points: [{ point_number: 1, nominal_value: 10, reading1: 10, reading2: 10.001, reading3: 9.999, expanded_uncertainty: 0.002, coverage_factor: 2 }],
        standards: [],
        technical_snapshot: { clientSnapshot: { name: "Cliente Fantasma Ltda", cnpj: "45.678.901/0001-22", city: "Campinas", state: "SP" } },
      }, { documentMeta: META.certBalanca, tenantName: LAB.legal_name, tenant: LAB });
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      drawCertificatePdf(doc, model, { logoDataUrl: logo, singlePage: false, tenant: LAB });
      writeDoc(doc, "14-certificado-balanca.pdf");
    });

    await run("certificado-pesos", async () => {
      const { jsPDF } = await import("jspdf");
      const { buildWeightCertificatePdfViewModel } = await import("@/lib/weightCertificatePdf/viewModel");
      const { drawWeightCertificatePdf } = await import("@/lib/weightCertificatePdf/drawWeightCertificatePdf");
      const model = buildWeightCertificatePdfViewModel({
        certificate_number: 8,
        certificate_year: 2026,
        certificate_type: "rastreavel",
        certificate_revision: "03",
        calibration_date: "2026-10-08",
        client_name: "Cliente Fantasma Ltda",
        status: "emitido",
        items: [{ identification: "P-01", nominal_value: "5000", nominal_unit: "g", conventional_mass: "5000,012", expanded_uncertainty: "0,8", weight_class: "F1" }],
        environmental: { initial_temperature: "23,1", final_temperature: "23,3", initial_humidity: "55", final_humidity: "56", initial_pressure: "1013", final_pressure: "1012" },
        standards: [],
      }, { documentMeta: META.certPeso, tenantName: LAB.legal_name, tenant: LAB });
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      drawWeightCertificatePdf(doc, model, { logoDataUrl: logo, tenant: LAB, documentMeta: META.certPeso });
      writeDoc(doc, "15-certificado-pesos.pdf");
    });

    await run("tbh", async () => {
      const { createTbhCorrectionPdfDocument, createTbhSessionCorrectionPdfDocument } = await import("@/lib/tbhCorrectionPdf/drawTbhCorrectionPdf");
      const { buildTbhCorrectionPdfViewModel, buildTbhSessionCorrectionPdfViewModel } = await import("@/lib/tbhCorrectionPdf/viewModel");
      const equip = buildTbhCorrectionPdfViewModel({
        equipment_name: "TBH-03",
        equipment_type: "thermo_baro_higrometro",
        manufacturer: "Incoterm",
        model: "7663",
        certificate_number: "TBH-2025-014",
        calibration_date: "2025-11-02",
        calibrated_by: "Laboratório de verificação",
        tbh_correction_calibration: {},
      }, "Laboratório de verificação");
      equip.logoDataUrl = logo;
      writeDoc(createTbhCorrectionPdfDocument(equip), "16-correcao-tbh.pdf");
      const session = buildTbhSessionCorrectionPdfViewModel({
        tenantName: "Laboratório de verificação",
        byEquipment: [{ equipment_name: "TBH-03", phases: {} }],
      });
      session.logoDataUrl = logo;
      writeDoc(createTbhSessionCorrectionPdfDocument(session), "17-tabela-correcao-tbh.pdf");
    });

    await run("procedimento", async () => {
      const { renderFormattedProcedurePdf } = await import("@/lib/documents/formattedProcedureLayout");
      const doc = renderFormattedProcedurePdf({
        logoDataUrl: logo,
        identity: { title: "PR-4.1 Confidencialidade e Imparcialidade", code: "PR-4.1", revision: "06", emissionIso: "2026-03-12", responsible: "Renata Oliveira", nextReview: "12/03/2027" },
        isProcedure: true,
        blocks: [{ type: "paragraph", text: "Este procedimento define como o laboratório protege a confidencialidade das informações do cliente." }],
      });
      writeDoc(doc, "18-procedimento-formatado.pdf");
    });

    await run("ficha", async () => {
      const { downloadDeviceTechnicalSheetPdf } = await import("@/lib/deviceTechnicalSheets/downloadDeviceTechnicalSheetPdf");
      await captureSaved("19-ficha-tecnica.pdf", () => downloadDeviceTechnicalSheetPdf([
        {
          identification: "P-01",
          equipmentType: "Peso padrão",
          manufacturer: "Knauer",
          location: "Laboratório",
          certificateNumber: "CP-2026-01",
          status: "APROVADO",
          equipmentClass: "F1",
          registeredClass: "F2",
        },
      ], { tenantName: "Laboratório de verificação", logoDataUrl: logo }));
    });

    await run("cronograma", async () => {
      const { downloadCalibrationSchedulePdf } = await import("@/lib/calibrationSchedule/downloadCalibrationSchedulePdf");
      await captureSaved("20-cronograma-calibracao.pdf", () => downloadCalibrationSchedulePdf({
        yearStart: 2026,
        years: [2026],
        rows: [{ label: "BL-12 Toledo 2098", marks: { 2026: { previsto: { 10: true }, realizado: { 10: true } } } }],
        tenantName: "Laboratório de verificação",
      }));
    });

    await run("manutencao", async () => {
      const { downloadMaintenanceProgramPdf } = await import("@/lib/maintenancePrograms/downloadMaintenanceProgramPdf");
      await captureSaved("21-programa-manutencao.pdf", () => downloadMaintenanceProgramPdf({
        year: 2026,
        programs: [],
        rows: [{ label: "BL-12 Toledo 2098", marks: { 10: "planejado" } }],
        issuedApprovedBy: "Renata Oliveira",
        tenantName: "Laboratório de verificação",
      }));
    });

    await run("verificacao", async () => {
      const { downloadEquipmentVerificationPdf } = await import("@/lib/equipmentVerifications/downloadEquipmentVerificationPdf");
      await captureSaved("24-verificacao-equipamento.pdf", () => downloadEquipmentVerificationPdf({
        equipment_kind: "pesos",
        year: 2026,
        assets: [{ id: "bl-12", name: "Toledo 2098", serial_number: "SN-88421" }],
        responses: {},
      }, { tenantName: "Laboratório de verificação", logoDataUrl: logo }));
    });

    await run("vigentes", async () => {
      const { downloadWeightCertificatesValidPdf, downloadEnvironmentCertificatesValidPdf } = await import("@/lib/cadastroPdf");
      const future = "2027-01-15";
      await captureSaved("22-certificados-peso-vigentes.pdf", () => downloadWeightCertificatesValidPdf([
        { set_name: "Conjunto F1", class: "F1", quantity: 12, manufacturer: "Knauer", certificate_number: "CP-2026-01", calibration_date: "2026-01-10", expiry_date: future, calibrated_by: "Laboratório de verificação" },
      ], "Laboratório de verificação"));
      await captureSaved("23-certificados-tbh-vigentes.pdf", () => downloadEnvironmentCertificatesValidPdf([
        { equipment_name: "TBH-03", manufacturer: "Incoterm", model: "7663", certificate_number: "TBH-2025-014", calibration_date: "2025-11-02", expiry_date: future, calibrated_by: "Laboratório de verificação" },
      ], "Laboratório de verificação"));
    });

    if (failures.length) {
      throw new Error(failures.join("\n"));
    }
    const written = fs.readdirSync(OUT_DIR).filter((name) => name.endsWith(".pdf"));
    expect(written.length).toBeGreaterThan(10);
  }, 120000);
});
