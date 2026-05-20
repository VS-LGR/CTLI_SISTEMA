import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-backup-cron",
};

const MANIFEST_VERSION = "1";
const CADASTRO_BUCKET = "cadastro-certificados";
const BRANDING_BUCKET = "tenant-branding";
/** ZIP devolvido em base64; acima disto a resposta da Edge Function pode falhar. */
const MAX_ZIP_BYTES = 5 * 1024 * 1024;

type Profile = { id: string; role: string; tenant_id: string | null };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function authGate(
  req: Request,
  tenantId: string,
): Promise<
  | { error: Response }
  | { admin: SupabaseClient; userId: string | null }
> {
  const authHeader = req.headers.get("Authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();

  const p = profile as Profile | null;
  if (!p) return { error: jsonResponse({ error: "Forbidden" }, 403) };

  const allowed =
    p.role === "admin" ||
    (p.role === "client" && p.tenant_id === tenantId);

  if (!allowed) {
    return { error: jsonResponse({ error: "Forbidden" }, 403) };
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return {
    admin: createClient(supabaseUrl, serviceKey),
    userId: user.id,
  };
}

async function listStoragePrefix(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<{ path: string; data: Uint8Array }[]> {
  const out: { path: string; data: Uint8Array }[] = [];
  const stack = [prefix.replace(/\/$/, "")];

  while (stack.length) {
    const folder = stack.pop()!;
    const { data: entries, error } = await admin.storage.from(bucket).list(folder, {
      limit: 500,
    });
    if (error || !entries) continue;

    for (const ent of entries) {
      const fullPath = folder ? `${folder}/${ent.name}` : ent.name;
      if (ent.id === null) {
        stack.push(fullPath);
      } else {
        const { data: blob, error: dlErr } = await admin.storage.from(bucket).download(fullPath);
        if (!dlErr && blob) {
          const buf = new Uint8Array(await blob.arrayBuffer());
          const rel = fullPath.startsWith(prefix)
            ? fullPath.slice(prefix.length).replace(/^\//, "")
            : fullPath;
          out.push({ path: rel, data: buf });
        }
      }
    }
  }
  return out;
}

async function fetchLegacyDocuments(
  tenantId: string,
  authHeader: string | null,
): Promise<{ documents: unknown[]; reminders: unknown[]; available: boolean; files: { docId: string; name: string; data: Uint8Array }[] }> {
  const base = (Deno.env.get("LEGACY_API_URL") || "").replace(/\/$/, "");
  const serviceToken = Deno.env.get("LEGACY_API_SERVICE_TOKEN") || "";
  if (!base) {
    return { documents: [], reminders: [], available: false, files: [] };
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (serviceToken) headers.Authorization = `Bearer ${serviceToken}`;
  else if (authHeader) headers.Authorization = authHeader;

  try {
    const docsRes = await fetch(`${base}/api/documents?tenant_id=${encodeURIComponent(tenantId)}`, { headers });
    if (!docsRes.ok) {
      return { documents: [], reminders: [], available: false, files: [] };
    }
    const docsRaw = await docsRes.json();
    const documents = Array.isArray(docsRaw) ? docsRaw : (docsRaw?.documents || docsRaw?.items || []);

    let reminders: unknown[] = [];
    try {
      const dashRes = await fetch(`${base}/api/dashboard?tenant_id=${encodeURIComponent(tenantId)}`, { headers });
      if (dashRes.ok) {
        const dash = await dashRes.json();
        reminders = dash?.reminders || [];
      }
    } catch { /* ignore */ }

    const files: { docId: string; name: string; data: Uint8Array }[] = [];
    for (const doc of documents as { id?: string; has_file?: boolean; file_name?: string }[]) {
      if (!doc?.id || !doc.has_file) continue;
      try {
        const dlRes = await fetch(`${base}/api/documents/${doc.id}/download`, { headers });
        if (dlRes.ok) {
          const buf = new Uint8Array(await dlRes.arrayBuffer());
          files.push({
            docId: doc.id,
            name: doc.file_name || "attachment.bin",
            data: buf,
          });
        }
      } catch { /* skip file */ }
    }

    return { documents, reminders, available: true, files };
  } catch {
    return { documents: [], reminders: [], available: false, files: [] };
  }
}

async function buildBackupZip(
  admin: SupabaseClient,
  tenantId: string,
  source: string,
  authHeader: string | null,
): Promise<{ zipBytes: Uint8Array; manifest: Record<string, unknown>; recordCount: number }> {
  const zip = new JSZip();

  const { data: tenant, error: tErr } = await admin.from("tenants").select("*").eq("id", tenantId).single();
  if (tErr || !tenant) throw new Error("Tenant não encontrado");

  const tables = {
    responsibles: () => admin.from("responsibles").select("*").eq("tenant_id", tenantId),
    suppliers: () => admin.from("supplier_registrations").select("*").eq("tenant_id", tenantId),
    end_customers: () => admin.from("end_customer_registrations").select("*").eq("tenant_id", tenantId),
    employees: () => admin.from("employee_registrations").select("*").eq("tenant_id", tenantId),
    weight_certs: () => admin.from("weight_standard_certificates").select("*").eq("tenant_id", tenantId),
    weight_items: () => admin.from("standard_weight_items").select("*").eq("tenant_id", tenantId),
    env_certs: () => admin.from("environment_sensor_certificates").select("*").eq("tenant_id", tenantId),
    coleta: () => admin.from("scale_calibration_collections").select("*").eq("tenant_id", tenantId),
  };

  const exported: Record<string, unknown[]> = {};
  for (const [key, fn] of Object.entries(tables)) {
    const { data, error } = await fn();
    if (error) throw new Error(`Export ${key}: ${error.message}`);
    exported[key] = data || [];
  }

  zip.file("tenant.json", JSON.stringify(tenant, null, 2));
  zip.file("responsibles.json", JSON.stringify(exported.responsibles, null, 2));
  zip.folder("cadastros");
  zip.file("cadastros/suppliers.json", JSON.stringify(exported.suppliers, null, 2));
  zip.file("cadastros/end_customers.json", JSON.stringify(exported.end_customers, null, 2));
  zip.file("cadastros/employees.json", JSON.stringify(exported.employees, null, 2));
  zip.file("cadastros/weight_certs.json", JSON.stringify(exported.weight_certs, null, 2));
  zip.file("cadastros/weight_items.json", JSON.stringify(exported.weight_items, null, 2));
  zip.file("cadastros/env_certs.json", JSON.stringify(exported.env_certs, null, 2));
  zip.file("coleta/collections.json", JSON.stringify(exported.coleta, null, 2));

  let storageFileCount = 0;
  const cadastroFiles = await listStoragePrefix(admin, CADASTRO_BUCKET, `${tenantId}/`);
  for (const f of cadastroFiles) {
    zip.file(`storage/${CADASTRO_BUCKET}/${f.path}`, f.data);
    storageFileCount++;
  }
  const brandingFiles = await listStoragePrefix(admin, BRANDING_BUCKET, `${tenantId}/`);
  for (const f of brandingFiles) {
    zip.file(`storage/${BRANDING_BUCKET}/${f.path}`, f.data);
    storageFileCount++;
  }

  const legacy = await fetchLegacyDocuments(tenantId, authHeader);
  if (legacy.available) {
    zip.file("legacy/documents.json", JSON.stringify(legacy.documents, null, 2));
    zip.file("legacy/reminders.json", JSON.stringify(legacy.reminders, null, 2));
    for (const f of legacy.files) {
      zip.file(`legacy/files/documents/${f.docId}/${f.name}`, f.data);
    }
  }

  const recordCount =
    (exported.responsibles?.length || 0) +
    (exported.suppliers?.length || 0) +
    (exported.end_customers?.length || 0) +
    (exported.employees?.length || 0) +
    (exported.weight_certs?.length || 0) +
    (exported.weight_items?.length || 0) +
    (exported.env_certs?.length || 0) +
    (exported.coleta?.length || 0) +
    (legacy.documents?.length || 0);

  const manifest = {
    version: MANIFEST_VERSION,
    tenant_id: tenantId,
    tenant_name: tenant.name,
    created_at: new Date().toISOString(),
    source,
    legacy_api_available: legacy.available,
    counts: {
      responsibles: exported.responsibles?.length || 0,
      suppliers: exported.suppliers?.length || 0,
      end_customers: exported.end_customers?.length || 0,
      employees: exported.employees?.length || 0,
      weight_certs: exported.weight_certs?.length || 0,
      weight_items: exported.weight_items?.length || 0,
      env_certs: exported.env_certs?.length || 0,
      coleta: exported.coleta?.length || 0,
      documents: legacy.documents?.length || 0,
      reminders: legacy.reminders?.length || 0,
      storage_files: storageFileCount,
    },
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const zipBytes = new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
  return { zipBytes, manifest, recordCount };
}

async function deleteTenantData(admin: SupabaseClient, tenantId: string) {
  await admin.from("scale_calibration_collections").delete().eq("tenant_id", tenantId);
  await admin.from("standard_weight_items").delete().eq("tenant_id", tenantId);
  await admin.from("weight_standard_certificates").delete().eq("tenant_id", tenantId);
  await admin.from("environment_sensor_certificates").delete().eq("tenant_id", tenantId);
  await admin.from("employee_registrations").update({ supervisor_id: null }).eq("tenant_id", tenantId);
  await admin.from("employee_registrations").delete().eq("tenant_id", tenantId);
  await admin.from("supplier_registrations").delete().eq("tenant_id", tenantId);
  await admin.from("end_customer_registrations").delete().eq("tenant_id", tenantId);
  await admin.from("responsibles").delete().eq("tenant_id", tenantId);

  for (const bucket of [CADASTRO_BUCKET, BRANDING_BUCKET]) {
    const files = await listStoragePrefix(admin, bucket, `${tenantId}/`);
    if (files.length) {
      const paths = files.map((f) => `${tenantId}/${f.path}`);
      await admin.storage.from(bucket).remove(paths);
    }
  }
}

function sortEmployeesForInsert(rows: Record<string, unknown>[]) {
  const byId = new Map(rows.map((r) => [r.id as string, r]));
  const inserted = new Set<string>();
  const out: Record<string, unknown>[] = [];

  const visit = (row: Record<string, unknown>) => {
    const id = row.id as string;
    if (inserted.has(id)) return;
    const sup = row.supervisor_id as string | null;
    if (sup && byId.has(sup) && !inserted.has(sup)) {
      visit(byId.get(sup)!);
    }
    inserted.add(id);
    out.push(row);
  };

  for (const r of rows) visit(r);
  return out;
}

function remapIds<T extends { id?: string }>(rows: T[], idMap: Map<string, string>): T[] {
  return rows.map((row) => {
    const copy = { ...row } as T & { supervisor_id?: string | null; weight_certificate_id?: string | null };
    if (copy.id) {
      const newId = crypto.randomUUID();
      idMap.set(copy.id, newId);
      copy.id = newId;
    }
    return copy;
  });
}

function applyIdMap(row: Record<string, unknown>, idMap: Map<string, string>) {
  if (row.supervisor_id && idMap.has(row.supervisor_id as string)) {
    row.supervisor_id = idMap.get(row.supervisor_id as string);
  }
  if (row.weight_certificate_id && idMap.has(row.weight_certificate_id as string)) {
    row.weight_certificate_id = idMap.get(row.weight_certificate_id as string);
  }
}

async function restoreFromZip(
  admin: SupabaseClient,
  tenantId: string,
  zipBytes: Uint8Array,
  replace: boolean,
  authHeader: string | null,
): Promise<Record<string, number>> {
  const zip = await JSZip.loadAsync(zipBytes);
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("ZIP inválido: manifest.json ausente");

  const manifest = JSON.parse(await manifestFile.async("string"));
  if (manifest.tenant_id !== tenantId) {
    throw new Error("O backup pertence a outro ambiente");
  }

  const readJson = async (path: string) => {
    const f = zip.file(path);
    if (!f) return [];
    return JSON.parse(await f.async("string"));
  };

  if (replace) {
    await deleteTenantData(admin, tenantId);
  }

  const idMap = new Map<string, string>();
  let responsibles = await readJson("responsibles.json");
  let suppliers = await readJson("cadastros/suppliers.json");
  let endCustomers = await readJson("cadastros/end_customers.json");
  let employees = await readJson("cadastros/employees.json");
  let weightCerts = await readJson("cadastros/weight_certs.json");
  let weightItems = await readJson("cadastros/weight_items.json");
  let envCerts = await readJson("cadastros/env_certs.json");
  let coleta = await readJson("coleta/collections.json");

  if (!replace) {
    responsibles = remapIds(responsibles, idMap);
    suppliers = remapIds(suppliers, idMap);
    endCustomers = remapIds(endCustomers, idMap);
    employees = remapIds(employees, idMap);
    weightCerts = remapIds(weightCerts, idMap);
    weightItems = remapIds(weightItems, idMap);
    envCerts = remapIds(envCerts, idMap);
    coleta = remapIds(coleta, idMap);
    for (const row of employees) applyIdMap(row, idMap);
    for (const row of weightItems) applyIdMap(row, idMap);
  }

  const counts = {
    responsibles_restored: 0,
    cadastros_restored: 0,
    coleta_restored: 0,
    storage_files_restored: 0,
    documents_restored: 0,
  };

  if (responsibles.length) {
    const rows = responsibles.map((r: Record<string, unknown>) => ({ ...r, tenant_id: tenantId }));
    const { error } = await admin.from("responsibles").insert(rows);
    if (error) throw new Error(`responsibles: ${error.message}`);
    counts.responsibles_restored = rows.length;
  }

  const insertCadastro = async (table: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) return 0;
    const payload = rows.map((r) => ({ ...r, tenant_id: tenantId }));
    const { error } = await admin.from(table).insert(payload);
    if (error) throw new Error(`${table}: ${error.message}`);
    return payload.length;
  };

  counts.cadastros_restored += await insertCadastro("supplier_registrations", suppliers);
  counts.cadastros_restored += await insertCadastro("end_customer_registrations", endCustomers);

  const sortedEmployees = sortEmployeesForInsert(employees);
  counts.cadastros_restored += await insertCadastro("employee_registrations", sortedEmployees);
  counts.cadastros_restored += await insertCadastro("weight_standard_certificates", weightCerts);
  counts.cadastros_restored += await insertCadastro("standard_weight_items", weightItems);
  counts.cadastros_restored += await insertCadastro("environment_sensor_certificates", envCerts);

  if (coleta.length) {
    const rows = coleta.map((r: Record<string, unknown>) => ({ ...r, tenant_id: tenantId }));
    const { error } = await admin.from("scale_calibration_collections").insert(rows);
    if (error) throw new Error(`coleta: ${error.message}`);
    counts.coleta_restored = rows.length;
  }

  const storagePaths = Object.keys(zip.files).filter((p) => p.startsWith("storage/"));
  for (const fullPath of storagePaths) {
    const parts = fullPath.split("/");
    if (parts.length < 3) continue;
    const bucket = parts[1];
    const relPath = parts.slice(2).join("/");
    const storagePath = `${tenantId}/${relPath}`;
    const f = zip.file(fullPath);
    if (!f) continue;
    const data = await f.async("uint8array");
    await admin.storage.from(bucket).upload(storagePath, data, { upsert: true });
    counts.storage_files_restored++;
  }

  const legacyCounts = await restoreLegacy(admin, tenantId, zip, replace, authHeader, replace ? null : idMap);
  counts.documents_restored = legacyCounts.documents_restored;

  return counts;
}

async function restoreLegacy(
  admin: SupabaseClient,
  tenantId: string,
  zip: JSZip,
  replace: boolean,
  authHeader: string | null,
  _idMap: Map<string, string> | null,
): Promise<{ documents_restored: number }> {
  const base = (Deno.env.get("LEGACY_API_URL") || "").replace(/\/$/, "");
  if (!base) return { documents_restored: 0 };

  const docsFile = zip.file("legacy/documents.json");
  if (!docsFile) return { documents_restored: 0 };

  const documents = JSON.parse(await docsFile.async("string"));
  const serviceToken = Deno.env.get("LEGACY_API_SERVICE_TOKEN") || "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (serviceToken) headers.Authorization = `Bearer ${serviceToken}`;
  else if (authHeader) headers.Authorization = authHeader;

  if (replace) {
    try {
      const listRes = await fetch(`${base}/api/documents?tenant_id=${encodeURIComponent(tenantId)}`, { headers });
      if (listRes.ok) {
        const existing = await listRes.json();
        const list = Array.isArray(existing) ? existing : (existing?.documents || []);
        for (const doc of list) {
          if (doc?.id) {
            await fetch(`${base}/api/documents/${doc.id}`, { method: "DELETE", headers });
          }
        }
      }
    } catch { /* ignore */ }
  }

  let restored = 0;
  for (const doc of documents as Record<string, unknown>[]) {
    const body = { ...doc, tenant_id: tenantId };
    delete body.id;
    try {
      const res = await fetch(`${base}/api/documents`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        const newId = created?.id;
        const oldId = doc.id as string;
        if (newId && oldId) {
          const filePath = `legacy/files/documents/${oldId}/`;
          for (const path of Object.keys(zip.files)) {
            if (path.startsWith(filePath) && !zip.files[path].dir) {
              const name = path.slice(filePath.length);
              const f = zip.file(path);
              if (!f) continue;
              const blob = await f.async("blob");
              const fd = new FormData();
              fd.append("file", blob, name);
              await fetch(`${base}/api/documents/${newId}/upload`, {
                method: "POST",
                headers: serviceToken ? { Authorization: `Bearer ${serviceToken}` } : (authHeader ? { Authorization: authHeader } : {}),
                body: fd,
              });
            }
          }
        }
        restored++;
      }
    } catch { /* skip */ }
  }

  const remFile = zip.file("legacy/reminders.json");
  if (remFile && replace) {
    const reminders = JSON.parse(await remFile.async("string"));
    for (const rem of reminders as { text?: string }[]) {
      if (!rem?.text) continue;
      try {
        await fetch(`${base}/api/dashboard/reminders`, {
          method: "POST",
          headers,
          body: JSON.stringify({ tenant_id: tenantId, text: rem.text }),
        });
      } catch { /* skip */ }
    }
  }

  return { documents_restored: restored };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("Content-Type") || "";
    let body: Record<string, unknown> = {};
    let zipFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      zipFile = form.get("file") as File | null;
      const action = form.get("action") as string;
      const tenantId = form.get("tenant_id") as string;
      const replace = form.get("replace") === "true";
      body = { action: action || "restore", tenant_id: tenantId, replace };
    } else {
      body = await req.json();
    }

    const action = String(body.action || "");
    const tenantId = String(body.tenant_id || "");
    if (!tenantId) return jsonResponse({ error: "tenant_id obrigatório" }, 400);

    const gate = await authGate(req, tenantId);
    if ("error" in gate) return gate.error;
    const { admin } = gate;
    const authHeader = req.headers.get("Authorization");

    if (action === "list") {
      const { data: tenant, error } = await admin
        .from("tenants")
        .select("last_backup_at, auto_interval_days")
        .eq("id", tenantId)
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({
        backups: [],
        storage_mode: "local",
        last_backup_at: tenant?.last_backup_at ?? null,
        auto_interval_days: tenant?.auto_interval_days ?? 20,
      });
    }

    if (action === "create") {
      const { zipBytes, manifest, recordCount } = await buildBackupZip(
        admin,
        tenantId,
        "manual",
        authHeader,
      );

      if (zipBytes.length > MAX_ZIP_BYTES) {
        return jsonResponse({
          error: `Backup muito grande (${Math.round(zipBytes.length / 1024 / 1024)} MB). Limite ~${MAX_ZIP_BYTES / 1024 / 1024} MB para download direto.`,
        }, 413);
      }

      const filename = `backup-${tenantId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.zip`;
      const created_at = new Date().toISOString();

      await admin
        .from("tenants")
        .update({ last_backup_at: created_at })
        .eq("id", tenantId);

      return jsonResponse({
        filename,
        created_at,
        doc_count: recordCount,
        size_bytes: zipBytes.length,
        zip_base64: uint8ToBase64(zipBytes),
        legacy_api_available: manifest.legacy_api_available,
        storage_mode: "local",
      });
    }

    if (action === "restore") {
      if (!zipFile) return jsonResponse({ error: "Arquivo ZIP obrigatório" }, 400);
      const replace = body.replace === true || body.replace === "true";
      const zipBytes = new Uint8Array(await zipFile.arrayBuffer());
      const counts = await restoreFromZip(admin, tenantId, zipBytes, replace, authHeader);
      return jsonResponse({
        ...counts,
        legacy_api_available: Boolean(Deno.env.get("LEGACY_API_URL")),
      });
    }

    return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
