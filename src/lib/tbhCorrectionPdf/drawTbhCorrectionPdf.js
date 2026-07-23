import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawInstitutionalReportHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT } from "@/lib/institutionalPdf/theme";

const TABLE_STYLES = {
  font: "helvetica",
  fontSize: 7,
  textColor: TEXT,
};

function drawEquipmentInfo(doc, vm, startY) {
  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Equipamento", ML, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const lines = [
    `Nome: ${vm.equipment.name}`,
    `Tipo: ${vm.equipment.type}`,
    `Fabricante / Modelo: ${vm.equipment.manufacturer} / ${vm.equipment.model}`,
    `Nº certificado: ${vm.equipment.certificateNumber}  |  Calibração: ${vm.equipment.calibrationDate}`,
    `Calibrado por: ${vm.equipment.calibratedBy}`,
  ];
  for (const line of lines) {
    doc.text(line, ML, y);
    y += 4.5;
  }
  return y + 4;
}

export function drawTbhCorrectionPdf(doc, vm) {
  let startY = drawInstitutionalReportHeader(doc, {
    title: vm.documentTitle,
    subtitle: `Ambiente: ${vm.tenantName || "—"}`,
  });
  startY = drawEquipmentInfo(doc, vm, startY + 2);

  for (const section of vm.sections || []) {
    for (const range of section.ranges || []) {
      if (doc.lastAutoTable?.finalY && doc.lastAutoTable.finalY > 240) {
        doc.addPage();
        startY = 14;
      } else if (doc.lastAutoTable?.finalY) {
        startY = doc.lastAutoTable.finalY + 8;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`${section.label} — ${range.label} (${range.bounds})`, ML, startY);

      const body = (range.points || []).map((p) => [p.device || "", p.supplier || ""]);
      autoTable(doc, {
        startY: startY + 3,
        margin: { left: ML },
        head: [["Indicado pelo equipamento", "Indicado pelo provedor"]],
        body: body.length ? body : [["—", "—"]],
        styles: TABLE_STYLES,
        headStyles: { fillColor: [217, 119, 6], textColor: TEXT, fontStyle: "bold" },
      });

      if (range.regression) {
        const y = doc.lastAutoTable.finalY + 3;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(
          `y = m·x + b  →  m = ${range.regression.slope.toFixed(8).replace(".", ",")}  ;  b = ${range.regression.intercept.toFixed(8).replace(".", ",")}  (${range.regression.pointCount} pts)`,
          ML,
          y,
        );
      }
    }
  }

  drawInstitutionalPageFooters(doc, {
    code: vm.documentCode,
    reference: vm.documentRef,
    revision: "00",
  });
}

export function drawTbhSessionCorrectionPdf(doc, vm) {
  let startY = drawInstitutionalReportHeader(doc, {
    title: vm.documentTitle,
    subtitle: `Ambiente: ${vm.tenantName || "—"}`,
  });
  startY += 4;

  for (const block of vm.blocks || []) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(block.equipmentName, ML, startY);
    startY += 4;

    autoTable(doc, {
      startY,
      margin: { left: ML },
      head: [["Grandeza", "Fase", "Faixa", "Aparelho", "Corrigida", "Correção"]],
      body: (block.rows || []).map((r) => [
        r.quantity, r.phase, r.rangeLabel, r.device, r.corrected, r.delta,
      ]),
      styles: TABLE_STYLES,
      headStyles: { fillColor: [37, 99, 235], textColor: TEXT, fontStyle: "bold" },
    });
    startY = doc.lastAutoTable.finalY + 8;
  }

  drawInstitutionalPageFooters(doc, {
    code: vm.documentCode,
    reference: vm.documentRef,
    revision: "00",
  });
}

export function createTbhCorrectionPdfDocument(vm) {
  const doc = new jsPDF({ orientation: "portrait" });
  drawTbhCorrectionPdf(doc, vm);
  return doc;
}

export function createTbhSessionCorrectionPdfDocument(vm) {
  const doc = new jsPDF({ orientation: "portrait" });
  drawTbhSessionCorrectionPdf(doc, vm);
  return doc;
}
