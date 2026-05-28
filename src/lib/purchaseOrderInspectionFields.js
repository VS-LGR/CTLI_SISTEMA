/**
 * Perguntas de inspeção — partilhadas entre formulário e PDF.
 */

export function formatBoolAnswer(value) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return "—";
}

const RESULT_LABELS = {
  aceito: "Aceito",
  reprovado: "Reprovado, devolver para o fornecedor",
};

function isCertType(type) {
  return type === "calibracao_pesos_padrao" || type === "calibracao_termo_baro_higrometro";
}

function isReportType(type) {
  return type === "ensaio_proficiencia" || type === "auditoria_interna";
}

/**
 * @returns {{ label: string, value: string }[]}
 */
export function buildInspectionPdfLines(type, inspection, employees = []) {
  if (!inspection) return [];

  const lines = [];
  const push = (label, value) => {
    if (value === undefined || value === null || value === "") return;
    lines.push({ label, value: String(value) });
  };

  push(
    "O item recebido confere com a descrição do pedido de compras?",
    formatBoolAnswer(inspection.received_matches_order),
  );

  if (isCertType(type)) {
    push(
      "O certificado adquirido confere com a descrição do Pedido de Compras?",
      formatBoolAnswer(inspection.certificate_matches_order),
    );
    push("Número(s) do(s) certificado(s)", inspection.certificate_numbers);
  }

  if (isReportType(type)) {
    push(
      type === "ensaio_proficiencia"
        ? "O fornecedor enviou relatório do PEP?"
        : "O fornecedor enviou relatório de auditoria?",
      formatBoolAnswer(inspection.supplier_sent_report),
    );
    if (type === "ensaio_proficiencia") {
      push(
        "O equipamento confere com a descrição do Pedido de Compras?",
        formatBoolAnswer(inspection.report_matches_order),
      );
    }
    if (type === "auditoria_interna") {
      push(
        "O relatório adquirido confere com a descrição do Pedido de Compras?",
        formatBoolAnswer(inspection.report_matches_order),
      );
    }
    push("Motivo (se não enviado)", inspection.reason);
  }

  const resultText = RESULT_LABELS[inspection.result] || inspection.result || "—";
  push("Resultado da inspeção", resultText);

  const responsible = employees.find((e) => e.id === inspection.inspection_responsible_id);
  push("Responsável pela inspeção", responsible?.full_name || "—");

  if (inspection.inspection_date) {
    const s = String(inspection.inspection_date).slice(0, 10);
    const [y, m, d] = s.split("-");
    push("Data da inspeção", y && m && d ? `${d}/${m}/${y}` : inspection.inspection_date);
  }

  if (inspection.notes?.trim()) {
    push("Observações", inspection.notes.trim());
  }

  return lines;
}

export function hasInspectionContent(type, inspection) {
  if (!inspection) return false;
  return buildInspectionPdfLines(type, inspection, []).length > 0;
}
