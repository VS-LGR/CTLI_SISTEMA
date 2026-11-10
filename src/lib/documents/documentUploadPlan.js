/**
 * Decisão de importação de PDF: revisão vigente, histórico e lote.
 * Funções puras — sem acesso a rede.
 */

export const UPLOAD_ACTIONS = {
  BECOME_VIGENTE: "become_vigente",
  ARCHIVE_ONLY: "archive_only",
  BLOCKED_SAME: "blocked_same",
  NEEDS_CONFIRM: "needs_confirm",
  PENDING_CODE: "pending_code",
};

export const UPLOAD_ACTION_LABELS = {
  become_vigente: "Tornar vigente",
  archive_only: "Arquivar no histórico",
  blocked_same: "Revisão já vigente",
  needs_confirm: "Indicar revisão",
  pending_code: "Escolher documento",
};

const CODE_IN_NAME = /(PR|RE|MQ)-[0-9]+(?:\.[0-9]+)*[A-Z]?/i;
const REV_IN_NAME = /rev(?:is[aã]o)?[.\s_-]*(\d+(?:\.\d+)?)/i;

/** Número inteiro da revisão, ou null quando o texto não é numérico. */
export function parseRevisionNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const labeled = raw.match(/rev(?:is[aã]o)?[.\s_-]*(\d+(?:\.\d+)?)/i);
  const source = labeled ? labeled[1] : raw;
  const match = source.match(/^(\d+)(?:\.\d+)?$/);
  if (!match) return null;
  return Number(match[1]);
}

export function formatRevisionLabel(numeric) {
  return String(numeric).padStart(2, "0");
}

/** Rótulo gravado na lista mestra e em tenant_documents.version. */
export function revisionFromVersion(version) {
  const parsed = parseRevisionNumber(version);
  if (parsed == null) return "00";
  return formatRevisionLabel(parsed);
}

/**
 * @returns {"newer"|"older"|"same"|"unknown"}
 */
export function compareRevisions(incoming, current) {
  const a = parseRevisionNumber(incoming);
  const b = parseRevisionNumber(current);
  if (a == null || b == null) return "unknown";
  if (a === b) return "same";
  return a > b ? "newer" : "older";
}

export function normalizeDocumentCode(code) {
  return String(code || "").trim().toUpperCase();
}

export function parseUploadFileName(fileName) {
  const base = String(fileName || "").replace(/\.[^.]+$/, "");
  const codeMatch = base.match(CODE_IN_NAME);
  const revMatch = base.match(REV_IN_NAME);
  const numeric = revMatch ? parseRevisionNumber(revMatch[1]) : null;
  return {
    code: codeMatch ? codeMatch[0].toUpperCase() : "",
    revision: numeric == null ? "" : formatRevisionLabel(numeric),
  };
}

/**
 * @returns {string} uma de UPLOAD_ACTIONS
 */
export function decideUploadAction({
  matched = false,
  incomingRevision = "",
  currentRevision = "",
  hasVigenteFile = false,
} = {}) {
  if (!matched) return UPLOAD_ACTIONS.PENDING_CODE;
  const incoming = parseRevisionNumber(incomingRevision);
  if (incoming == null) return UPLOAD_ACTIONS.NEEDS_CONFIRM;
  const current = parseRevisionNumber(currentRevision);
  if (current == null) return UPLOAD_ACTIONS.BECOME_VIGENTE;
  if (incoming === current) {
    return hasVigenteFile ? UPLOAD_ACTIONS.BLOCKED_SAME : UPLOAD_ACTIONS.BECOME_VIGENTE;
  }
  if (incoming > current) return UPLOAD_ACTIONS.BECOME_VIGENTE;
  return UPLOAD_ACTIONS.ARCHIVE_ONLY;
}

export function canCommitUploadAction(action) {
  return action === UPLOAD_ACTIONS.BECOME_VIGENTE || action === UPLOAD_ACTIONS.ARCHIVE_ONLY;
}

export function uploadActionHint(action, currentRevision) {
  const rev = currentRevision
    ? `Revisão vigente: ${revisionFromVersion(currentRevision)}.`
    : "Ainda não há revisão vigente.";
  if (action === UPLOAD_ACTIONS.BLOCKED_SAME) {
    return `${rev} O ficheiro está na mesma revisão e não substitui o vigente.`;
  }
  if (action === UPLOAD_ACTIONS.BECOME_VIGENTE) {
    return `${rev} Esta revisão passa a ser a vigente e a anterior fica no histórico.`;
  }
  if (action === UPLOAD_ACTIONS.ARCHIVE_ONLY) {
    return `${rev} Esta revisão é anterior e fica só no histórico.`;
  }
  if (action === UPLOAD_ACTIONS.NEEDS_CONFIRM) {
    return `${rev} Indique o número da revisão do ficheiro.`;
  }
  return "Escolha o documento da Lista Mestra com o mesmo código. Não é criado um código novo.";
}

/**
 * O que a sincronização com a Lista Mestra deve fazer depois de gravar o PDF.
 * Revisão anterior não avança current_revision nem aprova outra revisão vigente.
 */
export function planMasterSync({
  tenantDoc,
  previousDoc = null,
  currentRevision = "",
  isCreate = false,
} = {}) {
  const incoming = revisionFromVersion(tenantDoc?.version);
  const hasCurrent = parseRevisionNumber(currentRevision) != null && String(currentRevision ?? "").trim() !== "";
  const cmp = hasCurrent ? compareRevisions(incoming, currentRevision) : "newer";
  const hasFile = Boolean(tenantDoc?.has_file && tenantDoc?.storage_path);
  const fileChanged = !previousDoc || previousDoc.storage_path !== tenantDoc?.storage_path;
  const statusChanged = !previousDoc || previousDoc.status !== tenantDoc?.status;

  if (isCreate && tenantDoc?.status === "vigente" && cmp !== "older") {
    return { bump: cmp === "newer", revision: "approve" };
  }
  if (tenantDoc?.status === "vigente" && cmp === "newer") {
    return { bump: true, revision: "approve" };
  }
  if (tenantDoc?.status === "vigente" && cmp === "same") {
    if (hasFile && (fileChanged || statusChanged)) return { bump: false, revision: "attach_file" };
    return { bump: false, revision: "skip" };
  }
  if (tenantDoc?.status === "obsoleto" && hasFile && cmp === "older") {
    return { bump: false, revision: "archive" };
  }
  if (
    tenantDoc?.status === "obsoleto"
    && hasFile
    && cmp === "same"
    && previousDoc?.status === "vigente"
  ) {
    return { bump: false, revision: "keep_file" };
  }
  return { bump: false, revision: "skip" };
}

/**
 * No mesmo lote, só a revisão mais alta de cada código fica vigente.
 * Revisões mais baixas do lote vão para o histórico; repetidas ficam bloqueadas.
 */
export function orderBatchUploads(rows) {
  const winner = new Map();
  for (const row of rows) {
    if (row.action !== UPLOAD_ACTIONS.BECOME_VIGENTE || !row.masterId) continue;
    const n = parseRevisionNumber(row.revision);
    if (n == null) continue;
    const prev = winner.get(row.masterId);
    if (!prev || n > prev.n) winner.set(row.masterId, { n, id: row.id });
  }

  const adjusted = rows.map((row) => {
    if (row.action !== UPLOAD_ACTIONS.BECOME_VIGENTE || !row.masterId) return row;
    const top = winner.get(row.masterId);
    const n = parseRevisionNumber(row.revision);
    if (!top || n == null) return row;
    if (row.id === top.id) return row;
    if (n < top.n) return { ...row, action: UPLOAD_ACTIONS.ARCHIVE_ONLY };
    return { ...row, action: UPLOAD_ACTIONS.BLOCKED_SAME };
  });

  const rank = { archive_only: 0, become_vigente: 1 };
  return [...adjusted].sort((a, b) => {
    const ra = rank[a.action] ?? 2;
    const rb = rank[b.action] ?? 2;
    if (ra !== rb) return ra - rb;
    return (parseRevisionNumber(a.revision) || 0) - (parseRevisionNumber(b.revision) || 0);
  });
}
