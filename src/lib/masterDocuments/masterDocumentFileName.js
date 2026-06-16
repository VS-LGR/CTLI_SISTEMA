const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g;
const INVALID_VALUES = new Set(["undefined", "null", "nan", "#n/d", "#valor!"]);

export function sanitizeFileName(value, maxLen = 80) {
  if (value == null || value === "") return "";
  let s = String(value).trim();
  if (INVALID_VALUES.has(s.toLowerCase())) return "";
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(INVALID_FILENAME_CHARS, "-");
  s = s.replace(/\s+/g, "-");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s.slice(0, maxLen);
}

export function formatDateForFileName(date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    const br = String(date).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[1]}-${br[2]}-${br[3]}`;
    return sanitizeFileName(date, 20);
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function buildContextMap(context = {}) {
  const map = {
    codigo: context.codigo,
    titulo: context.titulo,
    revisao: context.revisao,
    dataRevisaoAtual: formatDateForFileName(context.dataRevisaoAtual || context.data),
    nome: context.nome,
    cargo: context.cargo,
    curso: context.curso,
    data: formatDateForFileName(context.data),
    ano: context.ano != null ? String(context.ano) : "",
    equipamento: context.equipamento,
    numero: sanitizeFileName(String(context.numero || "").replace(/\//g, "-"), 40),
    fornecedor: context.fornecedor,
    cliente: context.cliente,
    numeroSerie: context.numeroSerie || context.numero_serie,
    custom: context.custom,
  };
  return map;
}

export function validateRequiredFileNameFields(rule, context = {}) {
  const required = rule?.required_context_fields || [];
  const map = buildContextMap(context);
  const missing = required.filter((f) => {
    const v = map[f];
    return v == null || String(v).trim() === "";
  });
  return { valid: missing.length === 0, missing };
}

export function generateDocumentFileName(masterDocument, context = {}, extension = "pdf") {
  const doc = masterDocument || {};
  const ctx = {
    codigo: doc.code || context.codigo,
    titulo: doc.title || context.titulo,
    revisao: doc.current_revision || context.revisao || "00",
    dataRevisaoAtual: doc.current_revision_date || doc.current_issue_date || context.dataRevisaoAtual,
    ...context,
  };

  const pattern = doc.export_file_name_pattern || "{codigo}_{titulo}_Rev{revisao}";
  const map = buildContextMap(ctx);

  let result = pattern.replace(/\{(\w+)\}/g, (_, key) => sanitizeFileName(map[key] || ""));

  if (!doc.code && pattern.includes("{codigo}")) {
    result = result.replace(/^-+|_+/g, "").replace(/_{2,}/g, "_");
  }

  result = result
    .split("_")
    .filter((p) => p && p !== "-")
    .join("_");

  const ext = extension.replace(/^\./, "");
  return `${result}.${ext}`;
}

export function resolveFileNameConflict(fileName, existingNames = []) {
  if (!existingNames.includes(fileName)) return fileName;
  const dot = fileName.lastIndexOf(".");
  const base = dot >= 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot >= 0 ? fileName.slice(dot) : "";
  let version = 2;
  let candidate = `${base}_v${version}${ext}`;
  while (existingNames.includes(candidate)) {
    version += 1;
    candidate = `${base}_v${version}${ext}`;
  }
  return candidate;
}
