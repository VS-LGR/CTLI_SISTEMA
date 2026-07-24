/** Whitelist espelhada do frontend (src/lib/accessAcl.js) — validação nas edge functions. */

export const ACL_VERSION = 1;

const ALLOWED_MODULES = new Set([
  "coleta",
  "propostas",
  "certificados",
  "pedidos_compra",
  "solicitacao_orcamento",
  "lista_mestra",
  "cadastros",
  "pessoal",
]);

const ALLOWED_FOLDER_KEYS = new Set([
  "pr-4-1",
  "manual-qualidade",
  "politica-qualidade",
  "documentacao-legal",
  "estrutura-organizacional",
  "assinaturas",
  "pr-6-2",
  "pr-6-4",
  "pr-6-4-10",
  "pr-6-4-12",
  "pr-6-5",
  "pr-6-6",
  "pr-7-1",
  "pr-7-1-7",
  "pr-7-10",
  "pr-7-11",
  "pr-7-2",
  "pr-7-2-2",
  "pr-7-4",
  "pr-7-6",
  "pr-7-7",
  "pr-7-8",
  "pr-7-9",
  "pr-8-3",
  "pr-8-4",
  "pr-8-5",
  "pr-8-6-2",
  "pr-8-7",
  "pr-8-8",
  "pr-8-9",
]);

const ALLOWED_REQ_IDS = new Set(["4", "5", "6", "7", "8"]);

export function normalizeAccessAcl(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    return { version: ACL_VERSION, modules: [], folders: {} };
  }
  const obj = raw as Record<string, unknown>;
  const modulesIn = Array.isArray(obj.modules) ? obj.modules : [];
  const modules = [...new Set(
    modulesIn
      .map((m) => String(m || "").trim())
      .filter((m) => ALLOWED_MODULES.has(m)),
  )].sort();

  const foldersIn = obj.folders && typeof obj.folders === "object"
    ? obj.folders as Record<string, unknown>
    : {};
  const folders: Record<string, string[]> = {};
  Object.keys(foldersIn).forEach((reqId) => {
    const rid = String(reqId);
    if (!ALLOWED_REQ_IDS.has(rid)) return;
    const list = Array.isArray(foldersIn[reqId]) ? foldersIn[reqId] as unknown[] : [];
    const keys = [...new Set(
      list
        .map((k) => String(k || "").trim())
        .filter((k) => ALLOWED_FOLDER_KEYS.has(k)),
    )].sort();
    if (keys.length) folders[rid] = keys;
  });

  return { version: ACL_VERSION, modules, folders };
}

export function accessFlagsFromAcl(acl: Record<string, unknown>) {
  const modules = Array.isArray(acl.modules) ? acl.modules as string[] : [];
  return {
    access_coleta: modules.includes("coleta"),
    access_certificados: modules.includes("certificados"),
  };
}

/** Resolve ACL + flags a partir do body. Admin → ACL vazia sem version (legado full). */
export function resolveAccessAclFromBody(role: string, body: Record<string, unknown>) {
  if (role === "admin") {
    return {
      access_acl: {},
      access_coleta: false,
      access_certificados: false,
    };
  }
  const acl = normalizeAccessAcl(body.access_acl);
  const flags = accessFlagsFromAcl(acl);
  // Compat: se o client ainda mandar só toggles sem ACL, espelhar nos módulos
  if (!body.access_acl || typeof body.access_acl !== "object" || Number((body.access_acl as Record<string, unknown>).version) !== ACL_VERSION) {
    if (body.access_coleta !== undefined || body.access_certificados !== undefined) {
      const mods = new Set(acl.modules as string[]);
      if (body.access_coleta) mods.add("coleta");
      if (body.access_certificados) mods.add("certificados");
      acl.modules = [...mods].sort();
      return {
        access_acl: acl,
        access_coleta: Boolean(body.access_coleta),
        access_certificados: Boolean(body.access_certificados),
      };
    }
  }
  return {
    access_acl: acl,
    access_coleta: flags.access_coleta,
    access_certificados: flags.access_certificados,
  };
}
