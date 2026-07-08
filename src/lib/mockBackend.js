/**
 * Backend simulado para desenvolvimento local (sem API real).
 * Persistência: localStorage (chave pv_mock_db).
 */
import { buildMockBackupZip, restoreMockBackupFromBlob } from "@/lib/mockBackupZip";

const STORAGE_KEY = "pv_mock_db";

const REQ_NAMES = {
  "4": "Requisitos Gerais",
  "5": "Requisitos De Estrutura",
  "6": "Requisitos De Recurso",
  "7": "Requisitos De Processo",
  "8": "Requisitos De Gestão",
};

const nowIso = () => new Date().toISOString();

function docTimestamps(overrides = {}) {
  const t = nowIso();
  return {
    created_at: overrides.created_at || t,
    updated_at: overrides.updated_at || t,
    pinned_at: overrides.pinned_at ?? null,
  };
}

function mapDocSummary(d) {
  return {
    id: d.id,
    title: d.title,
    requirement: d.requirement,
    section: d.section,
    status: d.status,
    version: d.version,
    responsible: d.responsible,
    updated_at: d.updated_at,
    created_at: d.created_at,
    pinned_at: d.pinned_at,
  };
}

function ensureDocumentFields(doc) {
  const t = nowIso();
  if (!doc.created_at) doc.created_at = t;
  if (!doc.updated_at) doc.updated_at = doc.created_at;
  if (doc.pinned_at === undefined) doc.pinned_at = null;
  return doc;
}

const seedDb = () => ({
  tenants: [
    {
      id: "demo-tenant-1",
      name: "Cliente demonstração",
      code: "DEMO-001",
      description: "Ambiente local — dados fictícios",
      deployment_model: "full",
    },
  ],
  users: {
    "demo-tenant-1": [
      {
        id: "u-demo-1",
        name: "Maria Gestão",
        email: "maria@demo.local",
        role: "gerente_qualidade",
      },
    ],
  },
  responsibles: {
    "demo-tenant-1": [
      { id: "r-demo-1", name: "João Silva", role: "gerente_tecnico", email: "joao@demo.local" },
      { id: "r-demo-2", name: "Ana Costa", role: "gerente_qualidade", email: "ana@demo.local" },
    ],
  },
  documents: [
    {
      id: "doc-demo-1",
      tenant_id: "demo-tenant-1",
      requirement: "4",
      section: "procedimento",
      title: "Procedimento de boas-vindas (mock)",
      code: "2025-01-15",
      version: "1.0",
      responsible: "João Silva",
      review_date: "2026-12-31",
      content_html: "<p>Este conteúdo é <strong>100% local</strong> — sem servidor.</p>",
      status: "vigente",
      has_file: false,
      file_name: null,
      folder_key: null,
      ...docTimestamps({ created_at: "2026-05-10T10:00:00.000Z", updated_at: "2026-05-18T14:30:00.000Z" }),
    },
    {
      id: "doc-demo-2",
      tenant_id: "demo-tenant-1",
      requirement: "5",
      section: "registro",
      folder_key: "documentacao-legal",
      title: "Registro de exemplo",
      code: "",
      version: "1.0",
      responsible: "Ana Costa",
      review_date: "2026-06-01",
      content_html: "",
      status: "vigente",
      has_file: false,
      file_name: null,
      ...docTimestamps({ created_at: "2026-05-01T08:00:00.000Z", updated_at: "2026-05-15T09:00:00.000Z" }),
    },
  ],
  dashboard_reminders: {},
  backups: {
    "demo-tenant-1": {
      last_backup_at: null,
      auto_interval_days: 20,
      backups: [],
    },
  },
  counters: { doc: 2, user: 1, resp: 2, backup: 0, tenant: 1, reminder: 0 },
});

function loadDb() {
  const base = seedDb();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return {
      ...base,
      ...parsed,
      tenants: Array.isArray(parsed.tenants) ? parsed.tenants : base.tenants,
      documents: (Array.isArray(parsed.documents) ? parsed.documents : base.documents).map(ensureDocumentFields),
      dashboard_reminders:
        parsed.dashboard_reminders && typeof parsed.dashboard_reminders === "object"
          ? parsed.dashboard_reminders
          : base.dashboard_reminders,
      users: parsed.users && typeof parsed.users === "object" ? parsed.users : base.users,
      responsibles: parsed.responsibles && typeof parsed.responsibles === "object" ? parsed.responsibles : base.responsibles,
      backups: parsed.backups && typeof parsed.backups === "object" ? parsed.backups : base.backups,
      counters: { ...base.counters, ...(parsed.counters || {}) },
    };
  } catch {
    return base;
  }
}

function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function rejectApi(status, detail) {
  const err = new Error(typeof detail === "string" ? detail : "Erro");
  err.response = { status, data: { detail } };
  return Promise.reject(err);
}

function parsePath(url) {
  const [pathOnly, queryString] = url.split("?");
  const searchParams = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((v, k) => {
      searchParams[k] = v;
    });
  }
  return { path: pathOnly, searchParams };
}

function mergeQueryIntoParams(url, config) {
  const { searchParams } = parsePath(url);
  const fromConfig = (config && config.params) || {};
  return { ...searchParams, ...fromConfig };
}

function userFromEmail(email) {
  const e = (email || "").toLowerCase();
  if (e.includes("cliente") || e.includes("client")) {
    return {
      id: "mock-client",
      name: "Usuário cliente (mock)",
      email: email || "cliente@demo.local",
      role: "client",
      tenant_id: "demo-tenant-1",
    };
  }
  return {
    id: "mock-admin",
    name: "Administrador (mock)",
    email: email || "admin@demo.local",
    role: "admin",
    tenant_id: null,
  };
}

function buildDashboard(db, tenantId) {
  const docs = db.documents.filter((d) => d.tenant_id === tenantId);
  const total_documents = docs.length;
  const by_status = {
    vigente: docs.filter((d) => d.status === "vigente").length,
    obsoleto: docs.filter((d) => d.status === "obsoleto").length,
  };
  const today = new Date();
  const near_review = docs
    .filter((d) => d.review_date && d.status === "vigente")
    .map((d) => {
      const rd = new Date(d.review_date);
      const days_left = Math.ceil((rd - today) / (86400000));
      return { id: d.id, title: d.title, review_date: d.review_date, days_left };
    })
    .filter((r) => r.days_left <= 60)
    .sort((a, b) => a.days_left - b.days_left);

  const by_requirement = {};
  for (const req of ["4", "5", "6", "7", "8"]) {
    const sub = docs.filter((d) => d.requirement === req);
    by_requirement[req] = {
      name: REQ_NAMES[req] || `Requisito ${req}`,
      procedimentos: sub.filter((d) => d.section === "procedimento" && d.status === "vigente").length,
      registros: sub.filter((d) => d.section === "registro" && d.status === "vigente").length,
      obsoletos: sub.filter((d) => d.status === "obsoleto").length,
    };
  }

  const recent_documents = [...docs]
    .sort((a, b) => {
      const ta = new Date(b.updated_at || b.created_at || 0).getTime();
      const tb = new Date(a.updated_at || a.created_at || 0).getTime();
      return ta - tb;
    })
    .slice(0, 8)
    .map(mapDocSummary);

  const pinned_documents = docs
    .filter((d) => d.pinned_at)
    .sort((a, b) => new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime())
    .map(mapDocSummary);

  const reminders = [...(db.dashboard_reminders?.[tenantId] || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return {
    total_documents,
    by_status,
    near_review,
    by_requirement,
    recent_documents,
    pinned_documents,
    reminders,
  };
}

function getSessionUser() {
  try {
    const raw = localStorage.getItem("pv_mock_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function nextId(db, key) {
  const n = (db.counters[key] || 0) + 1;
  db.counters[key] = n;
  return String(n);
}

function readFormFile(formData) {
  const file = formData && formData.get && formData.get("file");
  if (!file || typeof file === "string") return null;
  return file;
}

export function createMockApiClient() {
  const wrap = (method) => (url, dataOrConfig, maybeConfig) => {
    let data;
    let config;
    if (method === "GET" || method === "DELETE") {
      data = undefined;
      config = dataOrConfig;
    } else {
      data = dataOrConfig;
      config = maybeConfig;
    }
    return Promise.resolve().then(() => request(method, url, data, config));
  };

  const request = async (method, url, data, config) => {
    const mergedParams = mergeQueryIntoParams(url, config);
    const { path } = parsePath(url);
    const db = loadDb();
    const token = localStorage.getItem("pv_token");
    const sessionOk = token === "mock-session";

    if (method === "POST" && path === "/auth/login") {
      const { email, password } = data || {};
      if (!email || password == null || password === "") {
        return rejectApi(400, "Informe e-mail e senha");
      }
      const user = userFromEmail(email);
      const payload = { ...user, access_token: "mock-session" };
      localStorage.setItem("pv_mock_user", JSON.stringify(user));
      localStorage.setItem("pv_token", "mock-session");
      return { data: payload };
    }

    if (method === "GET" && path === "/auth/me") {
      if (!sessionOk) return rejectApi(401, "Não autenticado");
      const raw = localStorage.getItem("pv_mock_user");
      if (!raw) return rejectApi(401, "Não autenticado");
      return { data: JSON.parse(raw) };
    }

    if (method === "POST" && path === "/auth/logout") {
      localStorage.removeItem("pv_mock_user");
      return { data: { ok: true } };
    }

    if (!sessionOk) return rejectApi(401, "Não autenticado");

    // —— Tenants ——
    if (method === "GET" && path === "/tenants") {
      return { data: db.tenants };
    }

    if (method === "POST" && path === "/tenants") {
      const tid = `tenant-${nextId(db, "tenant")}`;
      db.tenants.push({
        id: tid,
        name: data.name,
        code: data.code || "",
        description: data.description || "",
      });
      db.users[tid] = db.users[tid] || [];
      db.responsibles[tid] = db.responsibles[tid] || [];
      db.backups[tid] = { last_backup_at: null, auto_interval_days: 20, backups: [] };
      saveDb(db);
      return { data: { id: tid } };
    }

    if (method === "DELETE" && /^\/tenants\/[^/]+$/.test(path)) {
      const id = path.replace("/tenants/", "");
      db.tenants = db.tenants.filter((t) => t.id !== id);
      db.documents = db.documents.filter((d) => d.tenant_id !== id);
      delete db.users[id];
      delete db.responsibles[id];
      delete db.backups[id];
      saveDb(db);
      return { data: { ok: true } };
    }

    const usersMatch = path.match(/^\/tenants\/([^/]+)\/users$/);
    if (method === "GET" && usersMatch) {
      return { data: db.users[usersMatch[1]] || [] };
    }

    const respMatch = path.match(/^\/tenants\/([^/]+)\/responsibles$/);
    if (method === "GET" && respMatch) {
      return { data: db.responsibles[respMatch[1]] || [] };
    }

    if (method === "POST" && respMatch) {
      const tid = respMatch[1];
      const rid = `resp-${nextId(db, "resp")}`;
      const row = { id: rid, name: data.name, role: data.role, email: data.email || "" };
      if (!db.responsibles[tid]) db.responsibles[tid] = [];
      db.responsibles[tid].push(row);
      saveDb(db);
      return { data: row };
    }

    const delResp = path.match(/^\/tenants\/([^/]+)\/responsibles\/([^/]+)$/);
    if (method === "DELETE" && delResp) {
      const [, tid, rid] = delResp;
      db.responsibles[tid] = (db.responsibles[tid] || []).filter((r) => r.id !== rid);
      saveDb(db);
      return { data: { ok: true } };
    }

    if (method === "POST" && path === "/auth/register") {
      const { name, email, password, role, tenant_id } = data || {};
      if (!name || !email || !password) return rejectApi(400, "Campos obrigatórios");
      if (role !== "admin" && !tenant_id) return rejectApi(400, "Cliente obrigatório");
      const tid = role === "admin" ? null : tenant_id;
      const uid = `user-${nextId(db, "user")}`;
      if (tid) {
        if (!db.users[tid]) db.users[tid] = [];
        db.users[tid].push({ id: uid, name, email, role });
      }
      saveDb(db);
      return { data: { id: uid, email } };
    }

    // —— Documents ——
    if (method === "GET" && path === "/documents") {
      const { tenant_id, requirement, section, status, folder_key } = mergedParams;
      let list = db.documents.filter((d) => d.tenant_id === tenant_id);
      if (requirement) list = list.filter((d) => String(d.requirement) === String(requirement));
      if (section) list = list.filter((d) => d.section === section);
      if (status) list = list.filter((d) => d.status === status);
      if (folder_key) list = list.filter((d) => String(d.folder_key || "") === String(folder_key));
      return { data: list };
    }

    const dupMatch = path.match(/^\/documents\/([^/]+)\/duplicate$/);
    if (method === "POST" && dupMatch) {
      const src = db.documents.find((d) => d.id === dupMatch[1]);
      if (!src) return rejectApi(404, "Documento não encontrado");
      const nid = `doc-${nextId(db, "doc")}`;
      const ts = docTimestamps();
      const copy = {
        ...src,
        id: nid,
        title: data.title,
        version: data.version || src.version,
        content_html: data.content_html ?? src.content_html,
        code: data.code ?? src.code,
        responsible: data.responsible ?? src.responsible,
        review_date: data.review_date ?? src.review_date,
        status: "vigente",
        has_file: false,
        file_name: null,
        pinned_at: null,
        ...ts,
      };
      db.documents.push(copy);
      saveDb(db);
      return { data: copy };
    }

    const uploadMatch = path.match(/^\/documents\/([^/]+)\/upload$/);
    if (method === "POST" && uploadMatch) {
      const doc = db.documents.find((d) => d.id === uploadMatch[1]);
      if (!doc) return rejectApi(404, "Não encontrado");
      const file = readFormFile(data);
      doc.has_file = true;
      doc.file_name = file ? file.name : "anexo.bin";
      doc.updated_at = nowIso();
      if (file && (file.name || "").toLowerCase().endsWith(".docx")) {
        doc.content_html = `<p><em>Mock:</em> ficheiro <strong>${doc.file_name}</strong> anexado (conteúdo real não foi convertido).</p>`;
      }
      saveDb(db);
      return { data: { ...doc } };
    }

    const exportMatch = path.match(/^\/documents\/([^/]+)\/export$/);
    if (method === "GET" && exportMatch && config && config.responseType === "blob") {
      const doc = db.documents.find((d) => d.id === exportMatch[1]);
      if (!doc) return rejectApi(404, "Não encontrado");
      const fmt = mergedParams.format || "pdf";
      const mime = fmt === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";
      const blob = new Blob([`Mock export (${fmt}) — ${doc.title}\n`], { type: mime });
      return { data: blob };
    }

    const dlMatch = path.match(/^\/documents\/([^/]+)\/download$/);
    if (method === "GET" && dlMatch && config && config.responseType === "blob") {
      const doc = db.documents.find((d) => d.id === dlMatch[1]);
      if (!doc || !doc.has_file) return rejectApi(404, "Sem arquivo");
      const blob = new Blob([`Mock original: ${doc.file_name}\n`], { type: "application/octet-stream" });
      return { data: blob };
    }

    const docIdMatch = path.match(/^\/documents\/([^/]+)$/);
    if (method === "GET" && docIdMatch) {
      const doc = db.documents.find((d) => d.id === docIdMatch[1]);
      if (!doc) return rejectApi(404, "Não encontrado");
      return { data: { ...doc } };
    }

    if (method === "PUT" && docIdMatch) {
      const doc = db.documents.find((d) => d.id === docIdMatch[1]);
      if (!doc) return rejectApi(404, "Não encontrado");
      if (data && typeof data.pinned === "boolean") {
        doc.pinned_at = data.pinned ? nowIso() : null;
        delete data.pinned;
      }
      Object.assign(doc, data);
      doc.updated_at = nowIso();
      saveDb(db);
      return { data: { ...doc } };
    }

    if (method === "DELETE" && docIdMatch) {
      db.documents = db.documents.filter((d) => d.id !== docIdMatch[1]);
      saveDb(db);
      return { data: { ok: true } };
    }

    if (method === "POST" && path === "/documents") {
      const nid = `doc-${nextId(db, "doc")}`;
      const row = {
        id: nid,
        tenant_id: data.tenant_id,
        requirement: String(data.requirement),
        section: data.section,
        title: data.title,
        code: data.code || "",
        version: data.version || "1.0",
        responsible: data.responsible || "",
        review_date: data.review_date || null,
        content_html: data.content_html || "",
        status: data.status || "vigente",
        has_file: false,
        file_name: null,
        folder_key: data.folder_key != null && data.folder_key !== "" ? String(data.folder_key) : null,
        ...docTimestamps(),
      };
      db.documents.push(row);
      saveDb(db);
      return { data: row };
    }

    // —— Dashboard ——
    if (method === "GET" && path === "/dashboard") {
      const tenant_id = mergedParams.tenant_id;
      if (!tenant_id) return rejectApi(400, "tenant_id obrigatório");
      return { data: buildDashboard(db, tenant_id) };
    }

    if (method === "POST" && path === "/dashboard/reminders") {
      const { tenant_id, text } = data || {};
      if (!tenant_id) return rejectApi(400, "tenant_id obrigatório");
      if (!text || !String(text).trim()) return rejectApi(400, "Informe o texto do lembrete");
      const user = getSessionUser();
      if (!user || !["admin", "client"].includes(user.role)) {
        return rejectApi(403, "Sem permissão para criar lembretes");
      }
      if (!db.dashboard_reminders) db.dashboard_reminders = {};
      if (!db.dashboard_reminders[tenant_id]) db.dashboard_reminders[tenant_id] = [];
      const row = {
        id: `rem-${nextId(db, "reminder")}`,
        tenant_id,
        text: String(text).trim(),
        created_by_id: user.id,
        created_by_name: user.name || user.email || "Utilizador",
        created_at: nowIso(),
      };
      db.dashboard_reminders[tenant_id].unshift(row);
      saveDb(db);
      return { data: row };
    }

    const remDelMatch = path.match(/^\/dashboard\/reminders\/([^/]+)$/);
    if (method === "DELETE" && remDelMatch) {
      const tenant_id = mergedParams.tenant_id;
      if (!tenant_id) return rejectApi(400, "tenant_id obrigatório");
      const user = getSessionUser();
      if (!user || !["admin", "client"].includes(user.role)) {
        return rejectApi(403, "Sem permissão");
      }
      const list = db.dashboard_reminders?.[tenant_id] || [];
      const item = list.find((r) => r.id === remDelMatch[1]);
      if (!item) return rejectApi(404, "Lembrete não encontrado");
      if (user.role !== "admin" && item.created_by_id !== user.id) {
        return rejectApi(403, "Só pode excluir os seus lembretes");
      }
      db.dashboard_reminders[tenant_id] = list.filter((r) => r.id !== remDelMatch[1]);
      saveDb(db);
      return { data: { ok: true } };
    }

    // —— Backups ——
    const backupsList = path.match(/^\/tenants\/([^/]+)\/backups$/);
    if (method === "GET" && backupsList) {
      const tid = backupsList[1];
      const b = db.backups[tid] || { last_backup_at: null, auto_interval_days: 20 };
      return {
        data: {
          backups: [],
          storage_mode: "local",
          last_backup_at: b.last_backup_at ?? null,
          auto_interval_days: b.auto_interval_days ?? 20,
        },
      };
    }

    const backupPost = path.match(/^\/tenants\/([^/]+)\/backup$/);
    if (method === "POST" && backupPost) {
      const tid = backupPost[1];
      if (!db.backups[tid]) db.backups[tid] = { last_backup_at: null, auto_interval_days: 20 };
      const built = await buildMockBackupZip(db, tid, "manual");
      const created_at = new Date().toISOString();
      db.backups[tid].last_backup_at = created_at;
      saveDb(db);
      return {
        data: {
          filename: `backup-mock-${tid}-${created_at.slice(0, 10)}.zip`,
          created_at,
          doc_count: built.doc_count,
          size_bytes: built.size_bytes,
          zip_base64: built.zipBase64,
          legacy_api_available: true,
          storage_mode: "local",
        },
      };
    }

    const restoreMatch = path.match(/^\/tenants\/([^/]+)\/restore$/);
    if (method === "POST" && restoreMatch) {
      const tid = restoreMatch[1];
      const replace = mergedParams.replace === "true" || mergedParams.replace === true;
      const file = readFormFile(data);
      if (!file) return rejectApi(400, "Arquivo ZIP obrigatório");
      try {
        const result = await restoreMockBackupFromBlob(db, tid, file, replace);
        saveDb(db);
        return { data: result };
      } catch (e) {
        return rejectApi(400, String(e.message || e));
      }
    }

    return rejectApi(404, `Mock: rota não implementada ${method} ${path}`);
  };

  return {
    get: wrap("GET"),
    post: wrap("POST"),
    put: wrap("PUT"),
    delete: wrap("DELETE"),
    interceptors: {
      request: { use: () => 0 },
      response: { use: () => 0 },
    },
  };
}
