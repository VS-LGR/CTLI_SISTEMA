/**
 * @jest-environment node
 *
 * Dois PDFs preenchidos para revisão visual.
 * Saída: <raiz>/pdf-verificacao/
 *
 *   npm test -- --watchAll=false --testPathPattern=exportVerificationPdfs --runInBand
 */
import { TextEncoder, TextDecoder } from "util";
import fs from "fs";
import path from "path";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.mock("sonner", () => ({
  toast: { warning() {}, success() {}, error() {}, info() {} },
}));

const OUT_DIR = path.resolve(process.cwd(), "pdf-verificacao");

describe("PDFs preenchidos para verificação", () => {
  test("exporta procedimento formatado e ficha técnica", async () => {
    const { jsPDF } = await import("jspdf");
    const { documentIdentity } = await import("@/lib/documents/formattedProcedureModel");
    const { renderFormattedProcedurePdf } = await import("@/lib/documents/formattedProcedureLayout");
    const { downloadDeviceTechnicalSheetPdf } = await import("@/lib/deviceTechnicalSheets/downloadDeviceTechnicalSheetPdf");

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const logoDataUrl = `data:image/png;base64,${fs.readFileSync(path.resolve(process.cwd(), "public/Logo_QUATI.png")).toString("base64")}`;

    function writeDoc(doc, fileName) {
      fs.writeFileSync(path.join(OUT_DIR, fileName), Buffer.from(doc.output("arraybuffer")));
    }

    const identity = documentIdentity({
      title: "PR-4.1 Confidencialidade e Imparcialidade",
      code: "2026-03-12",
      version: "06",
      responsible: "Renata Oliveira",
      review_date: "2027-03-12",
    });

    const procedure = renderFormattedProcedurePdf({
      identity,
      isProcedure: true,
      logoDataUrl,
      distributions: [
        { area: "Laboratório de massa", copy_type: "Digital", distribution_date: "2026-03-12" },
        { area: "Qualidade", copy_type: "Controlada", distribution_date: "2026-03-15" },
        { area: "Direção técnica", copy_type: "Digital", distribution_date: "2026-03-15" },
      ],
      revisions: [
        { revision_number: "06", change_description: "Cabeçalho limitado a logo, nome e página. Controlo passou para a folha inicial.", revision_date: "2026-03-12" },
        { revision_number: "05", change_description: "Inclusão da lista de distribuição na lista mestra.", revision_date: "2025-11-02" },
      ],
      signatures: [
        { title: "Elaboração", responsible: "Renata Oliveira", version: "06" },
        { title: "Aprovação", responsible: "Direção técnica", version: "06" },
      ],
      blocks: [
        { type: "heading", level: 1, text: "1. Objectivo" },
        { type: "paragraph", text: "Este procedimento define como o laboratório protege a confidencialidade das informações do cliente e trata situações que possam comprometer a imparcialidade." },
        { type: "heading", level: 2, text: "2. Responsabilidades" },
        {
          type: "table",
          header: true,
          rows: [
            ["Função", "Responsabilidade"],
            ["Direção técnica", "Aprovar o procedimento e analisar ameaças à imparcialidade."],
            ["Qualidade", "Manter a lista mestra, a distribuição e o histórico de revisão."],
            ["Técnico", "Não divulgar resultados fora do canal autorizado pelo cliente."],
          ],
        },
        { type: "heading", level: 2, text: "3. Regras de acesso" },
        {
          type: "list",
          ordered: false,
          items: [
            "Cada colaborador usa credencial individual.",
            "A senha não é partilhada.",
            "O cliente gere os utilizadores do seu ambiente.",
          ],
        },
        { type: "paragraph", text: "Marca usada nesta amostra de verificação:" },
        { type: "image", src: logoDataUrl },
      ],
    });
    writeDoc(procedure, "01-procedimento-formatado.pdf");

    const originalSave = jsPDF.prototype.save;
    jsPDF.prototype.save = function saveVerification(fileName) {
      writeDoc(this, "02-ficha-tecnica.pdf");
      return fileName;
    };
    const before = new Set(fs.readdirSync(process.cwd()).filter((name) => name.endsWith(".pdf")));
    try {
      await downloadDeviceTechnicalSheetPdf([
        {
          identification: "P-01",
          equipmentType: "Peso Padrão",
          manufacturer: "Mettler",
          location: "Sala de massa",
          certificateNumber: "CM-2026-014",
          calibratedBy: "Lab. de referência",
          calibrationDate: "2026-02-10",
          nextCalibrationDate: "2027-02-10",
          intermediateCheck: "2026-08-10",
          frequencyStatus: "Anual · no prazo",
          status: "APROVADO",
          nominalValue: "200 g",
          conventionalValue: "200,0012 g",
          errorFound: "0,0012 g",
          maxError: "0,10 mg",
          uncertainty: "0,03 mg",
          maxUncertainty: "0,10 mg",
          unit: "g",
          equipmentClass: "F1",
          registeredClass: "F2",
          quantity: "Massa",
          vcMin: "199,9990 g",
          vcMax: "200,0030 g",
          maintenancePlan: "RE-6.4.12A",
          history: "Em uso",
          updatedAt: "2026-03-20T14:00:00.000Z",
        },
        {
          identification: "P-22",
          equipmentType: "Peso Padrão",
          manufacturer: "Sartorius",
          location: "Sala de massa",
          certificateNumber: "CM-2025-088",
          calibratedBy: "Lab. de referência",
          calibrationDate: "2025-01-08",
          nextCalibrationDate: "2026-01-08",
          intermediateCheck: "2025-07-08",
          frequencyStatus: "Anual · vencido",
          status: "VENCIDO",
          nominalValue: "1 kg",
          conventionalValue: "1,000004 kg",
          errorFound: "0,004 g",
          maxError: "1,6 mg",
          uncertainty: "0,50 mg",
          maxUncertainty: "0,50 mg",
          unit: "kg",
          equipmentClass: "E2",
          registeredClass: "E2",
          quantity: "Massa",
          vcMin: "0,999998 kg",
          vcMax: "1,000010 kg",
          maintenancePlan: "RE-6.4.12A",
          history: "Aguardar substituição do certificado",
          updatedAt: "2026-02-01T10:00:00.000Z",
        },
        {
          identification: "TBH-03",
          equipmentType: "Termobarohigrómetro",
          manufacturer: "Testo",
          location: "Sala de calibração",
          certificateNumber: "TA-2026-003",
          calibratedBy: "Laboratório interno",
          calibrationDate: "2026-04-02",
          nextCalibrationDate: "2027-04-02",
          intermediateCheck: "2026-10-02",
          frequencyStatus: "Anual · no prazo",
          status: "APROVADO",
          nominalValue: "N/A",
          conventionalValue: "N/A",
          errorFound: "N/A",
          maxError: "N/A",
          uncertainty: "0,3 °C",
          maxUncertainty: "0,5 °C",
          unit: "°C",
          equipmentClass: "N/A",
          registeredClass: "N/A",
          quantity: "Temperatura",
          vcMin: "N/A",
          vcMax: "N/A",
          maintenancePlan: "RE-6.4.12A",
          history: "Em uso",
          updatedAt: "2026-04-02T09:30:00.000Z",
        },
      ], {
        tenantName: "Laboratório de verificação",
        logoDataUrl,
        historyRows: [
          {
            changed_at: "2026-03-20",
            identification: "P-01",
            field_label: "Certificado",
            old_value: "CM-2025-014",
            new_value: "CM-2026-014",
            certificate_number_snapshot: "CM-2026-014",
          },
        ],
      });
    } finally {
      jsPDF.prototype.save = originalSave;
    }
    const created = fs.readdirSync(process.cwd()).filter((name) => name.endsWith(".pdf") && !before.has(name));
    if (created[0]) {
      fs.renameSync(path.join(process.cwd(), created[0]), path.join(OUT_DIR, "02-ficha-tecnica.pdf"));
    }

    expect(fs.existsSync(path.join(OUT_DIR, "01-procedimento-formatado.pdf"))).toBe(true);
    expect(fs.existsSync(path.join(OUT_DIR, "02-ficha-tecnica.pdf"))).toBe(true);
  });
});
