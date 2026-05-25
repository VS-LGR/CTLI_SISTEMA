import mammoth from "mammoth";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MAMMOTH_STYLE_MAP = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "b => strong",
  "i => em",
  "u => u",
];

const mammothImageConverter = {
  convertImage: mammoth.images.imgElement((image) =>
    image.read("base64").then((imageBuffer) => ({
      src: `data:${image.contentType};base64,${imageBuffer}`,
    })),
  ),
};

/** Apenas .docx (Office Open XML). Não inclui .doc legado. */
export function isDocxFile(file) {
  if (!file) return false;
  const n = (file.name || "").toLowerCase();
  if (n.endsWith(".docx")) return true;
  if (file.type === DOCX_MIME) return true;
  return false;
}

/** Ficheiro já guardado no Storage é .docx */
export function isDocxFileName(fileName, mime) {
  const n = (fileName || "").toLowerCase();
  if (n.endsWith(".docx")) return true;
  if (mime === DOCX_MIME) return true;
  return false;
}

/** Word 97–2003 (.doc) — anexo apenas, sem mammoth. */
export function isLegacyDocFile(file) {
  if (!file?.name) return false;
  const n = file.name.toLowerCase();
  return n.endsWith(".doc") && !n.endsWith(".docx");
}

/** Limpa HTML do mammoth para o TipTap (tabelas, imagens, sem tags Office). */
export function normalizeHtmlForEditor(html) {
  if (!html) return "";
  let out = html;
  out = out.replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, "");
  out = out.replace(/<\/?o:[^>]+>/gi, "");
  out = out.replace(/<span[^>]*>\s*<\/span>/gi, "");
  out = out.replace(/\sstyle="[^"]*mso-[^"]*"/gi, "");
  out = out.replace(/<table(?![^>]*class=)/gi, '<table class="doc-table"');
  out = out.replace(/<img([^>]+)>/gi, (m, attrs) => {
    if (/src=/i.test(attrs)) return `<img${attrs}>`;
    return m;
  });
  return out.trim();
}

function hasMeaningfulHtml(html) {
  if (!html?.trim()) return false;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim().length > 0 || div.querySelector("img, table");
}

async function convertArrayBufferToHtml(arrayBuffer) {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    { styleMap: MAMMOTH_STYLE_MAP, ...mammothImageConverter },
  );
  return normalizeHtmlForEditor(result.value || "");
}

/** Converte .docx (File) para HTML. */
export async function docxFileToHtml(file) {
  const arrayBuffer = await file.arrayBuffer();
  return convertArrayBufferToHtml(arrayBuffer);
}

/** Converte .docx (Blob) para HTML — reimportação a partir do Storage. */
export async function docxBlobToHtml(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  return convertArrayBufferToHtml(arrayBuffer);
}

/**
 * Tenta importar .docx para o editor. Em falha, devolve html null e aviso
 * para o caller fazer upload só do ficheiro.
 */
export async function tryConvertDocxToHtml(file) {
  if (!isDocxFile(file)) {
    return { html: null, warning: null, imported: false };
  }
  try {
    const html = await docxFileToHtml(file);
    if (!hasMeaningfulHtml(html)) {
      return {
        html: null,
        warning: "O .docx não contém texto reconhecível para o editor.",
        imported: false,
      };
    }
    return { html, warning: null, imported: true };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[docxImport] conversão falhou", err);
    }
    const hint = isLegacyDocFile(file)
      ? "Formato .doc antigo não suporta importação para o editor."
      : "Não foi possível ler o .docx (ficheiro inválido ou corrompido).";
    return { html: null, warning: hint, imported: false };
  }
}

/** Mensagem de sucesso após upload, conforme tipo de ficheiro e conversão. */
export function uploadSuccessMessage(file, { imported, warning } = {}) {
  if (isDocxFile(file) && imported) return "Word importado para o editor";
  if (isDocxFile(file)) return "Word anexado (abrir no editor para editar)";
  if (isLegacyDocFile(file)) return "Arquivo .doc anexado (sem importação para o editor)";
  if (warning) return `Arquivo anexado. ${warning}`;
  return "Arquivo anexado";
}
