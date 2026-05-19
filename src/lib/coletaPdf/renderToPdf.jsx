import React from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { ColetaPdfDocument } from "./ColetaPdfDocument";
import { buildColetaPdfViewModel, coletaPdfFileSlug } from "./viewModel";
import { PAGE_EM_H, PAGE_EM_PX, PAGE_EM_W, PAGE_PX_H, PAGE_PX_W } from "./layoutSpec";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;

/**
 * @param {object} row
 * @param {string} tenantName
 * @param {{ logoDataUrl?: string, envCerts?: object[], weightItems?: object[], tenant?: object }} opts
 */
export async function renderColetaPdf(row, tenantName = "", opts = {}) {
  const model = buildColetaPdfViewModel(row, tenantName, opts);
  const slug = coletaPdfFileSlug(row);
  const { logoDataUrl } = opts;

  const container = document.createElement("div");
  container.setAttribute("data-coleta-pdf-export", "true");
  // Na viewport (z-index atrás do app): html2canvas falha com left:-10000 ou opacity no ancestral
  container.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "z-index:-1",
    "pointer-events:none",
    `width:${PAGE_PX_W}px`,
    "overflow:visible",
    "background:#fff",
  ].join(";");
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<ColetaPdfDocument model={model} logoUrl={logoDataUrl} />);

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const pages = container.querySelectorAll(".coleta-pdf-page");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < pages.length; i += 1) {
    const pageEl = pages[i];
    pageEl.style.width = `${PAGE_EM_W}em`;
    pageEl.style.height = `${PAGE_EM_H}em`;
    pageEl.style.fontSize = `${PAGE_EM_PX}px`;
    pageEl.style.boxSizing = "border-box";

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: PAGE_PX_W,
      height: PAGE_PX_H,
      windowWidth: PAGE_PX_W,
      windowHeight: PAGE_PX_H,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
    });
    const img = canvas.toDataURL("image/png");
    if (i > 0) doc.addPage();
    doc.addImage(img, "PNG", 0, 0, PAGE_W_MM, PAGE_H_MM);
  }

  root.unmount();
  container.remove();

  doc.save(`coleta-${slug}.pdf`);
}
