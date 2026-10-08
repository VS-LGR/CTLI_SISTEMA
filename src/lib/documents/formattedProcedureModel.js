import { formatDateBr } from "@/lib/quotationRequestDisplay";

function masterLookupCode(docRecord) {
  const code = String(docRecord?.code || "").trim();
  if (code && !/^\d{4}-\d{2}-\d{2}$/.test(code)) return code;
  const title = String(docRecord?.title || "");
  const match = title.match(/\b((?:PR|RE|FOR|IT|MQ)[-\s]?\d[\d.]*)\b/i);
  return match ? match[1].replace(/\s+/g, "-").toUpperCase() : "";
}

/** Identidade lida dos campos actuais do editor. Não grava nada. */
export function documentIdentity(docRecord = {}) {
  const codeRaw = String(docRecord.code || "").trim();
  const codeIsDate = /^\d{4}-\d{2}-\d{2}$/.test(codeRaw);
  const title = String(docRecord.title || "").trim() || "Documento";
  const fromTitle = masterLookupCode({ code: codeRaw, title });
  const nextRaw = String(docRecord.review_date || "").trim();
  return {
    title,
    code: codeIsDate ? (fromTitle || "—") : (codeRaw || fromTitle || "—"),
    revision: String(docRecord.version || "").trim() || "—",
    emissionIso: codeIsDate ? codeRaw : null,
    emissionLabel: codeIsDate ? formatDateBr(codeRaw) : "—",
    responsible: String(docRecord.responsible || "").trim() || "—",
    nextReview: nextRaw ? formatDateBr(nextRaw) : "—",
  };
}

function textOf(el) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function pushImage(blocks, node) {
  const src = node.getAttribute?.("src") || "";
  if (src.startsWith("data:image/")) blocks.push({ type: "image", src });
}

/**
 * Converte o HTML do corpo Word (mammoth) em blocos com tabelas e imagens.
 * Cabeçalho e rodapé do .docx não entram neste HTML.
 */
export function htmlToBlocks(html) {
  const source = String(html || "").trim();
  if (!source || typeof DOMParser === "undefined") return [];
  const parsed = new DOMParser().parseFromString(`<body>${source}</body>`, "text/html");
  const blocks = [];

  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === 3) {
      const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
      if (text) blocks.push({ type: "paragraph", text });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName;

    if (tag === "TABLE") {
      const rows = [];
      let header = false;
      Array.from(node.rows || []).forEach((tr, index) => {
        const cells = Array.from(tr.children).filter((cell) => cell.tagName === "TD" || cell.tagName === "TH");
        if (!cells.length) return;
        if (index === 0 && cells.some((cell) => cell.tagName === "TH")) header = true;
        rows.push(cells.map((cell) => textOf(cell)));
      });
      if (rows.length) blocks.push({ type: "table", rows, header });
      return;
    }

    if (tag === "UL" || tag === "OL") {
      const items = Array.from(node.children)
        .filter((child) => child.tagName === "LI")
        .map((item) => textOf(item))
        .filter(Boolean);
      if (items.length) blocks.push({ type: "list", ordered: tag === "OL", items });
      return;
    }

    if (/^H[1-6]$/.test(tag)) {
      const text = textOf(node);
      if (text) blocks.push({ type: "heading", level: Number(tag[1]), text });
      return;
    }

    if (tag === "IMG") {
      pushImage(blocks, node);
      return;
    }

    if (tag === "P" || tag === "BLOCKQUOTE") {
      node.querySelectorAll("img").forEach((img) => pushImage(blocks, img));
      const text = textOf(node);
      if (text) blocks.push({ type: "paragraph", text });
      return;
    }

    const elementChildren = Array.from(node.children || []);
    const hasBlock = elementChildren.some((child) => /^(P|DIV|TABLE|UL|OL|H[1-6]|BLOCKQUOTE|SECTION|IMG)$/.test(child.tagName));
    if (!hasBlock) {
      node.querySelectorAll?.("img")?.forEach((img) => pushImage(blocks, img));
      const text = textOf(node);
      if (text) blocks.push({ type: "paragraph", text });
      return;
    }
    Array.from(node.childNodes).forEach(walk);
  };

  Array.from(parsed.body.childNodes).forEach(walk);
  return blocks;
}
