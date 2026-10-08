/**
 * Casca comum dos PDF: ordem do modelo (empresa, título, controlo, secções)
 * e tratamento visual do guia QUATI (preto, branco, laranja só em filetes).
 * Código e revisão aparecem na faixa e na tabela de controlo da primeira página.
 */
import { ML, MR, HTML_FORM } from "./theme";

export function stripRevision(revision) {
  return String(revision || "00").replace(/^rev\.?\s*/i, "").trim() || "00";
}

function imageFormat(dataUrl) {
  const head = String(dataUrl || "").slice(0, 40);
  if (head.includes("image/jpeg") || head.includes("image/jpg")) return "JPEG";
  if (head.includes("image/webp")) return "WEBP";
  return "PNG";
}

function bytesFromDataUrl(dataUrl) {
  const payload = String(dataUrl).split(",")[1] || "";
  if (typeof atob === "function") {
    const bin = atob(payload);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i) & 255;
    return bytes;
  }
  return Uint8Array.from(Buffer.from(payload, "base64"));
}

function u16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u32(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

/** Largura e altura em píxeis, sem redesenhar a imagem. */
export function readImagePixelSize(dataUrl) {
  try {
    const bytes = bytesFromDataUrl(dataUrl);
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      return { width: u32(bytes, 16), height: u32(bytes, 20) };
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let i = 2;
      while (i < bytes.length - 8) {
        if (bytes[i] !== 0xff) {
          i += 1;
          continue;
        }
        const marker = bytes[i + 1];
        const len = u16(bytes, i + 2);
        if (marker >= 0xc0 && marker <= 0xc2) {
          return { width: u16(bytes, i + 7), height: u16(bytes, i + 5) };
        }
        if (len < 2) break;
        i += 2 + len;
      }
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49) {
      return { width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8) };
    }
  } catch {
    /* formato não lido */
  }
  return null;
}

/**
 * Encaixa a imagem na caixa máxima sem esticar.
 * @returns {{ w: number, h: number }}
 */
export function fitLogoInBox(dataUrl, maxW, maxH, doc) {
  let size = readImagePixelSize(dataUrl);
  if (!size?.width || !size?.height) {
    try {
      const props = doc?.getImageProperties?.(dataUrl);
      if (props?.width && props?.height) size = { width: props.width, height: props.height };
    } catch {
      size = null;
    }
  }
  if (!size?.width || !size?.height) return { w: Math.min(maxW, maxH), h: Math.min(maxW, maxH) };
  const scale = Math.min(maxW / size.width, maxH / size.height);
  return { w: size.width * scale, h: size.height * scale };
}

function contentRight(doc) {
  const pageW = doc.internal?.pageSize?.getWidth?.() || 210;
  return pageW > 210 ? pageW - 10 : MR;
}

function footerY(doc, override) {
  if (override != null) return override;
  const pageH = doc.internal?.pageSize?.getHeight?.() || 297;
  return pageH > 250 ? 287 : pageH - 8;
}

/** Dados da empresa a partir do tenant (faturamento) ou do laboratório do certificado. */
export function companyFromSources({ tenant, lab, fallbackName } = {}) {
  const t = tenant || {};
  const cityState = [t.billing_city, t.billing_state].filter(Boolean).join("/");
  const address = [t.billing_address || lab?.address || "", cityState].filter(Boolean).join(" — ");
  return {
    legalName: t.legal_name || lab?.name || fallbackName || t.name || "",
    cnpj: t.billing_cnpj || lab?.cnpj || "",
    address,
    phone: t.billing_phone || lab?.phone || t.phone || "",
    email: t.billing_email || lab?.email || "",
  };
}

function rememberIdentity(doc, code, revision) {
  doc.__quatiIdentity = {
    code: code || "",
    revision: revision ? stripRevision(revision) : "",
  };
}

/**
 * Título de secção: texto preto e filete laranja, sem faixa preenchida.
 * @returns {number} y do conteúdo seguinte
 */
export function drawGuideSectionTitle(doc, x, y, width, text, fontSize = 10) {
  const em = fontSize * 0.3528;
  const baseline = y + em;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.setTextColor(...HTML_FORM.text);
  doc.text(String(text || ""), x, baseline);
  const lineY = baseline + em * 0.38 + 1.1;
  doc.setDrawColor(...HTML_FORM.accent);
  doc.setLineWidth(0.4);
  doc.line(x, lineY, x + Math.max(width, 8), lineY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...HTML_FORM.text);
  return lineY + 5.6;
}

/**
 * Logo, bloco da empresa, título com código e revisão, e tabela de controlo.
 * @returns {number} y do conteúdo seguinte
 */
export function drawHtmlFormHeader(doc, {
  logoDataUrl,
  company = {},
  title = "",
  code = "",
  reference = "",
  revision = "",
  emission = "",
  elaborado = "",
  verificado = "",
  aprovado = "",
  withControl = false,
  yStart = 8,
} = {}) {
  const rev = stripRevision(revision);
  const right = contentRight(doc);
  let y = yStart;
  const logoMaxW = 42;
  const logoMaxH = 16;
  let logoDrawW = 0;
  let logoDrawH = 0;

  if (logoDataUrl) {
    try {
      const box = fitLogoInBox(logoDataUrl, logoMaxW, logoMaxH, doc);
      doc.addImage(logoDataUrl, imageFormat(logoDataUrl), ML, y, box.w, box.h);
      logoDrawW = box.w;
      logoDrawH = box.h;
    } catch {
      /* logo opcional */
    }
  }

  const textW = right - ML - (logoDrawW > 0 ? logoDrawW + 6 : 0);
  doc.setTextColor(...HTML_FORM.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const nameLines = doc.splitTextToSize(company.legalName || " ", textW);
  if (company.legalName) {
    doc.text(nameLines, right, y + 3.2, { align: "right" });
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...HTML_FORM.muted);
  let ty = company.legalName ? y + 3.2 + nameLines.length * 3.4 : y + 3.2;
  const detail = [
    company.cnpj ? `CNPJ ${company.cnpj}` : "",
    company.address || "",
    [company.phone ? `Tel ${company.phone}` : "", company.email || ""].filter(Boolean).join(" · "),
  ].filter(Boolean);
  detail.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, textW);
    doc.text(wrapped, right, ty, { align: "right" });
    ty += wrapped.length * 3.1;
  });

  const bandBottom = Math.max(y + Math.max(logoDrawH, 10), detail.length ? ty : y) + 1.2;
  doc.setDrawColor(...HTML_FORM.accent);
  doc.setLineWidth(0.6);
  doc.line(ML, bandBottom, right, bandBottom);
  y = bandBottom + 4.2;

  const codeLabel = [code, `Rev. ${rev}`].filter(Boolean).join(" · ");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...HTML_FORM.text);
  const codeW = codeLabel ? doc.getTextWidth(codeLabel) + 4 : 0;
  doc.setFontSize(12);
  const titleLine = doc.splitTextToSize(String(title || " "), Math.max(right - ML - codeW, 40))[0];
  doc.text(titleLine, ML, y);
  if (codeLabel) {
    doc.setFontSize(8);
    doc.text(codeLabel, right, y, { align: "right" });
  }
  y += 1.6;
  doc.setDrawColor(...HTML_FORM.accent);
  doc.setLineWidth(0.35);
  doc.line(ML, y, right, y);
  y += 3;
  rememberIdentity(doc, code, rev);

  if (withControl) {
    const cells = [
      ["Código", code],
      ["Referência", reference || ""],
      ["Revisão", rev],
      ["Emissão", emission || ""],
      ["Elaborado por", elaborado || ""],
      ["Verificado por", verificado || ""],
      ["Aprovado por", aprovado || ""],
    ];
    const cols = 3;
    const cellW = (right - ML) / cols;
    const rowH = 8;
    cells.forEach((cell, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = ML + col * cellW;
      const cy = y + row * rowH;
      const w = i === cells.length - 1 ? right - x : cellW;
      doc.setFillColor(...HTML_FORM.label);
      doc.rect(x, cy, w, 3.1, "F");
      doc.setDrawColor(...HTML_FORM.border);
      doc.setLineWidth(0.15);
      doc.rect(x, cy, w, rowH, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(...HTML_FORM.muted);
      doc.text(cell[0], x + 1, cy + 2.15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...HTML_FORM.text);
      doc.text(String(cell[1] || " "), x + 1, cy + 6, { maxWidth: w - 2 });
    });
    y += rowH * 3 + 2.5;
  }

  return y;
}

/** Rodapé: código e revisão, sistema discreto, página à direita. */
export function drawHtmlFormFooters(doc, { code = "", revision = "", footerY: footerOverride, rightX } = {}) {
  const stored = doc.__quatiIdentity || {};
  const revSource = revision || stored.revision || "";
  const left = [code || stored.code || "", revSource ? `Rev. ${stripRevision(revSource)}` : ""]
    .filter(Boolean)
    .join(" · ");
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    const y = footerY(doc, footerOverride);
    const right = rightX ?? contentRight(doc);
    const mid = (ML + right) / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...HTML_FORM.muted);
    if (left) doc.text(left, ML, y);
    doc.setFontSize(7);
    doc.text("Emitido via QUATI", mid, y, { align: "center" });
    doc.setFontSize(8);
    doc.text(`Página ${p} de ${total}`, right, y, { align: "right" });
  }
}
