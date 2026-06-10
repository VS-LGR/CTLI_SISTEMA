import {
  buildCompetencyPdfViewModel,
  buildAdequacyPdfViewModel,
  buildMonitoringPdfViewModel,
  buildExperienceEvaluationPdfViewModel,
  buildSelectionPdfViewModel,
  buildAttendanceListPdfViewModel,
} from "@/lib/personnelPdf/viewModels";
import {
  competencyExportFilename,
  adequacyExportFilename,
  monitoringExportFilename,
  experienceExportFilename,
  selectionExportFilename,
  attendanceExportFilename,
} from "@/lib/personnelExportFilename";
import {
  buildDocumentChildren,
  buildKvTable,
  buildSectionTitle,
  buildTextBlock,
  buildListSection,
  buildSectionsFromModel,
  packAndDownload,
} from "./docxHelpers";
import { Paragraph, Table, TableRow, TableCell, WidthType, TextRun } from "docx";
import { displayValue } from "@/lib/quotationRequestDisplay";

function competencyLikeBody(model) {
  return [
    ...buildKvTable(model.subjectMetaRows),
    ...buildKvTable(model.metaRows),
    ...buildSectionsFromModel(model.sections),
    ...buildTextBlock(model.authText),
    ...buildSectionTitle("Responsável pela Análise e Aprovação"),
    ...buildTextBlock(model.approvalName),
  ];
}

export async function generateCompetencyDocx(position) {
  const model = buildCompetencyPdfViewModel(position);
  const children = buildDocumentChildren(model.header, competencyLikeBody(model));
  await packAndDownload(children, competencyExportFilename(position, "docx"));
}

export async function generateAdequacyDocx(record) {
  const model = buildAdequacyPdfViewModel(record);
  const children = buildDocumentChildren(model.header, competencyLikeBody(model));
  await packAndDownload(children, adequacyExportFilename(record, "docx"));
}

export async function generateMonitoringDocx(record) {
  const model = buildMonitoringPdfViewModel(record);
  const body = [
    ...buildKvTable(model.subjectMetaRows),
    ...buildKvTable(model.metaRows),
    ...buildSectionTitle("1. Supervisão e Monitoramento"),
    ...buildKvTable(model.supervisionRows),
    ...buildSectionTitle("1.1 Competências Monitoradas"),
    ...buildKvTable(model.competencyRows),
    ...buildSectionTitle("2. Treinamento"),
    ...buildKvTable(model.trainingRows),
    ...buildSectionTitle("3. Próximo Monitoramento"),
    ...buildKvTable(model.nextRows),
    ...buildTextBlock(model.authText),
    ...buildSectionTitle("Funcionário se mantém adequado à função"),
    ...buildTextBlock(model.suitability),
    ...buildSectionTitle("Responsável pela Análise e Aprovação"),
    ...buildTextBlock(model.approvalName),
  ];
  await packAndDownload(buildDocumentChildren(model.header, body), monitoringExportFilename(record, "docx"));
}

export async function generateExperienceDocx(record) {
  const model = buildExperienceEvaluationPdfViewModel(record);
  const itemRows = (model.evaluationItems || []).map((item) => [
    `${item.item_number || ""}. ${displayValue(item.description)}`.trim(),
    displayValue(item.score),
    "",
  ]);
  const body = [
    ...buildKvTable(model.subjectMetaRows),
    ...buildKvTable(model.identityRows),
    ...buildSectionTitle("Critérios de avaliação"),
    ...(itemRows.length ? [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ["Critério", "Nota", "Observações"].map((h) => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            })),
          }),
          ...itemRows.map((row) => new TableRow({
            children: row.map((cell) => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: cell })] })],
            })),
          })),
        ],
      }),
    ] : []),
    ...buildKvTable([
      ["Média", model.averageScore],
      ["Data final do período", model.periodEndDate],
      ["Critério de aprovação", model.approvalCriterion],
      ["Resultado", model.resultLabel],
      ["Parecer", model.conclusiveOpinionLabel],
    ]),
    ...buildSectionTitle("Avaliado por"),
    ...buildTextBlock(model.evaluatorName),
    ...buildTextBlock(`Data: ${model.signatureDate}`),
  ];
  await packAndDownload(buildDocumentChildren(model.header, body), experienceExportFilename(record, "docx"));
}

export async function generateSelectionDocx(record) {
  const model = buildSelectionPdfViewModel(record);
  const eduLines = (model.educationChecklist || []).map((e) => `${e.checked ? "[x]" : "[ ]"} ${e.label}`);
  const attr = model.attributions;
  const body = [
    ...buildKvTable(model.subjectMetaRows),
    ...buildKvTable(model.page1Rows),
    ...buildSectionTitle("Nível de Formação"),
    ...eduLines.map((line) => buildTextBlock(line)).flat(),
    ...buildSectionTitle("Atribuições do Cargo conforme RE-6.2C"),
    ...(attr.showActivities ? buildListSection("1.1 Conjunto de Atividades Relacionadas à Função", [attr.functionActivities]) : []),
    ...(attr.showTechnical ? buildListSection("1.2 Autoridades e Responsabilidades Técnicas", attr.technicalAuthorities) : []),
    ...(attr.showManagerial ? buildListSection("1.3 Autoridades e Responsabilidades Gerenciais", attr.managerialAuthorities) : []),
    ...buildListSection("Conhecimentos Gerais", model.generalKnowledge),
    ...buildListSection("Conhecimento Técnico", model.technicalKnowledge),
    ...buildListSection("Habilidade", model.skills),
    ...buildListSection("Qualificação", model.qualifications),
    ...buildListSection("Experiência", model.experience),
    ...buildSectionTitle("Parecer Conclusivo"),
    ...buildTextBlock(model.approved ? "Sim" : "Não"),
    ...buildTextBlock(model.opinionText),
    ...buildSectionTitle("Responsável pela Análise e Aprovação"),
    ...buildTextBlock(model.approvalName),
  ];
  await packAndDownload(buildDocumentChildren(model.header, body), selectionExportFilename(record, "docx"));
}

export async function generateAttendanceDocx(record) {
  const model = buildAttendanceListPdfViewModel(record);
  const head = ["Nº", "Nome completo", "Departamento", "Visto", "Frequência", "Resultado"];
  const body = [
    ...buildKvTable(model.subjectMetaRows),
    ...buildKvTable(model.courseRows),
    ...buildSectionTitle(displayValue(model.courseTitle)),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: head.map((h) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
          })),
        }),
        ...(model.participants || []).map((row) => new TableRow({
          children: row.map((cell) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: displayValue(cell) })] })],
          })),
        })),
      ],
    }),
    ...buildSectionTitle("Resumo de Conteúdo do Curso ou Palestra"),
    ...buildTextBlock(model.contentSummary),
    ...(model.observations ? [
      ...buildSectionTitle("Observações"),
      ...buildTextBlock(model.observations),
    ] : []),
    ...buildSectionTitle("Movimento Geral"),
    ...buildKvTable(model.movementRows),
  ];
  await packAndDownload(buildDocumentChildren(model.header, body), attendanceExportFilename(record, "docx"));
}
