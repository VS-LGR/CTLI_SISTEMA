import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { ColetaPdfDocument } from "./ColetaPdfDocument";
import { buildColetaPdfViewModel, coletaPdfFileSlug } from "./viewModel";

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
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;z-index:-1;pointer-events:none;";
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
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: pageEl.offsetWidth,
      height: pageEl.offsetHeight,
    });
    const img = canvas.toDataURL("image/png");
    if (i > 0) doc.addPage();
    doc.addImage(img, "PNG", 0, 0, PAGE_W_MM, PAGE_H_MM);
  }

  root.unmount();
  container.remove();

  doc.save(`coleta-${slug}.pdf`);
}
