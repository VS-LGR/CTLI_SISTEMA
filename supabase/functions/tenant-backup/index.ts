import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { getServiceRoleKey } from "../_shared/env.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-backup-cron",
};

const MANIFEST_VERSION = "3";
const PAGE_SIZE = 1000;
const INSERT_CHUNK = 400;
const IN_CHUNK = 100;
const SIGNED_URL_TTL_SEC = 60 * 60; // 1h
const DEFAULT_RETENTION_DAYS = 90;

const CADASTRO_BUCKET = "cadastro-certificados";
const BRANDING_BUCKET = "tenant-branding";
const DOCUMENTS_BUCKET = "tenant-documents";
const BACKUP_BUCKET = "tenant-backups";

type Profile = { id: string; role: string; tenant_id: string | null };

type TenantTableSpec = {
  table: string;
  zip: string;
  /** Campos FK extra a remapear (além de *_id genérico) */
  forceTenantId?: boolean;
};

/** Tabelas com tenant_id — ordem de INSERT (pais antes de filhos). DELETE = reverse. */
const TENANT_TABLES: TenantTableSpec[] = [
  { table: "responsibles", zip: "responsibles.json", forceTenantId: true },
  { table: "supplier_registrations", zip: "cadastros/suppliers.json", forceTenantId: true },
  { table: "end_customer_registrations", zip: "cadastros/end_customers.json", forceTenantId: true },
  { table: "personnel_standard_options", zip: "cadastros/personnel_options.json", forceTenantId: true },
  { table: "employee_registrations", zip: "cadastros/employees.json", forceTenantId: true },
  { table: "personnel_positions", zip: "cadastros/personnel_positions.json", forceTenantId: true },
  { table: "personnel_competency_adequacies", zip: "cadastros/personnel_adequacies.json", forceTenantId: true },
  { table: "personnel_monitorings", zip: "cadastros/personnel_monitorings.json", forceTenantId: true },
  { table: "personnel_experience_evaluations", zip: "cadastros/personnel_exp_evaluations.json", forceTenantId: true },
  { table: "personnel_selections", zip: "cadastros/personnel_selections.json", forceTenantId: true },
  { table: "personnel_attendance_lists", zip: "cadastros/personnel_attendance_lists.json", forceTenantId: true },
  { table: "weight_standard_certificates", zip: "cadastros/weight_certs.json", forceTenantId: true },
  { table: "standard_weight_items", zip: "cadastros/weight_items.json", forceTenantId: true },
  { table: "environment_sensor_certificates", zip: "cadastros/env_certs.json", forceTenantId: true },
  { table: "scale_registrations", zip: "cadastros/scale_registrations.json", forceTenantId: true },
  { table: "scale_calibration_collections", zip: "coleta/collections.json", forceTenantId: true },
  { table: "dashboard_reminders", zip: "dashboard/reminders.json", forceTenantId: true },
  { table: "quotation_requests", zip: "orcamentos/requests.json", forceTenantId: true },
  { table: "purchase_orders", zip: "pedidos_compra/orders.json", forceTenantId: true },
  { table: "commercial_proposals", zip: "propostas/proposals.json", forceTenantId: true },
  { table: "master_documents", zip: "lista_mestra/documents.json", forceTenantId: true },
  { table: "external_document_controls", zip: "lista_mestra/external_controls.json", forceTenantId: true },
  { table: "controlled_software", zip: "lista_mestra/controlled_software.json", forceTenantId: true },
  { table: "master_document_change_logs", zip: "lista_mestra/change_logs.json", forceTenantId: true },
  { table: "equipment_computers", zip: "equipamentos/computers.json", forceTenantId: true },
  { table: "equipment_vehicles", zip: "equipamentos/vehicles.json", forceTenantId: true },
  { table: "equipment_verifications", zip: "equipamentos/verifications.json", forceTenantId: true },
  { table: "calibration_schedule_overrides", zip: "manutencao/schedule_overrides.json", forceTenantId: true },
  { table: "equipment_maintenance_programs", zip: "manutencao/programs.json", forceTenantId: true },
  { table: "equipment_maintenance_events", zip: "manutencao/events.json", forceTenantId: true },
  { table: "device_technical_sheet_history", zip: "fichas/device_technical_sheet_history.json", forceTenantId: true },
  { table: "calibration_certificates", zip: "certificados/calibration_certificates.json", forceTenantId: true },
  { table: "weight_calibration_collections", zip: "certificados/weight_collections.json", forceTenantId: true },
  { table: "weight_calibration_certificates", zip: "certificados/weight_certificates.json", forceTenantId: true },
  { table: "certificate_email_deliveries", zip: "certificados/certificate_email_deliveries.json", forceTenantId: true },
  { table: "weight_certificate_email_deliveries", zip: "certificados/weight_email_deliveries.json", forceTenantId: true },
  { table: "tenant_documents", zip: "documents/tenant_documents.json", forceTenantId: true },
];

type ChildTableSpec = {
  table: string;
  zip: string;
  parentTable: string;
  parentFk: string;
};

/**
 * Em modo MERGE (acrescentar), linhas com a mesma chave natural no ambiente
 * reutilizam o id existente (não inserem de novo) — evita unique_violation
 * ao reimportar backup do mesmo tenant.
 */
const MERGE_NATURAL_KEYS: { table: string; keys: string[] }[] = [
  { table: "personnel_standard_options", keys: ["category", "label"] },
  { table: "employee_registrations", keys: ["registration_code"] },
  { table: "supplier_registrations", keys: ["registration_code"] },
  { table: "end_customer_registrations", keys: ["registration_code"] },
  { table: "quotation_requests", keys: ["request_year", "request_number"] },
  { table: "purchase_orders", keys: ["order_year", "order_number"] },
  { table: "commercial_proposals", keys: ["proposal_year", "proposal_number"] },
  { table: "equipment_verifications", keys: ["equipment_kind", "year"] },
  { table: "equipment_maintenance_programs", keys: ["year", "equipment_kind"] },
  /** Mesmo código na lista mestra = mesmo documento (unique parcial tenant+code). */
  { table: "master_documents", keys: ["code"] },
  /** Certificados ativos: unique (tenant, year, number). */
  { table: "calibration_certificates", keys: ["certificate_year", "certificate_number"] },
  { table: "weight_calibration_certificates", keys: ["certificate_year", "certificate_number"] },
  {
    table: "calibration_schedule_overrides",
    keys: ["source", "source_id", "year", "month", "mark_kind"],
  },
];

/** Tabelas tenant com FK a pai — sanitizar após insert do pai (merge idempotente). */
const TENANT_FK_SANITIZE: {
  table: string;
  fk: string;
  parentTable: string;
  nullable: boolean;
}[] = [
  { table: "master_document_change_logs", fk: "master_document_id", parentTable: "master_documents", nullable: true },
  { table: "certificate_email_deliveries", fk: "certificate_id", parentTable: "calibration_certificates", nullable: false },
  { table: "weight_certificate_email_deliveries", fk: "certificate_id", parentTable: "weight_calibration_certificates", nullable: false },
];

const MERGE_CHILD_NATURAL_KEYS: { table: string; keys: string[] }[] = [
  { table: "personnel_experience_evaluation_items", keys: ["evaluation_id", "item_number"] },
];

/** Filhos sem tenant_id (ou derivados do pai). */
const CHILD_TABLES: ChildTableSpec[] = [
  { table: "personnel_experience_evaluation_items", zip: "cadastros/personnel_exp_eval_items.json", parentTable: "personnel_experience_evaluations", parentFk: "evaluation_id" },
  { table: "personnel_attendance_participants", zip: "cadastros/personnel_attendance_participants.json", parentTable: "personnel_attendance_lists", parentFk: "attendance_list_id" },
  { table: "quotation_request_type_sections", zip: "orcamentos/type_sections.json", parentTable: "quotation_requests", parentFk: "quotation_request_id" },
  { table: "quotation_request_items", zip: "orcamentos/items.json", parentTable: "quotation_requests", parentFk: "quotation_request_id" },
  { table: "quotation_request_attachments", zip: "orcamentos/attachments.json", parentTable: "quotation_requests", parentFk: "quotation_request_id" },
  { table: "quotation_request_status_history", zip: "orcamentos/status_history.json", parentTable: "quotation_requests", parentFk: "quotation_request_id" },
  { table: "quotation_request_conversions", zip: "orcamentos/conversions.json", parentTable: "quotation_requests", parentFk: "quotation_request_id" },
  { table: "purchase_order_items", zip: "pedidos_compra/items.json", parentTable: "purchase_orders", parentFk: "purchase_order_id" },
  { table: "purchase_order_inspections", zip: "pedidos_compra/inspections.json", parentTable: "purchase_orders", parentFk: "purchase_order_id" },
  { table: "purchase_order_signatures", zip: "pedidos_compra/signatures.json", parentTable: "purchase_orders", parentFk: "purchase_order_id" },
  { table: "purchase_order_attachments", zip: "pedidos_compra/attachments.json", parentTable: "purchase_orders", parentFk: "purchase_order_id" },
  { table: "commercial_proposal_scales", zip: "propostas/scales.json", parentTable: "commercial_proposals", parentFk: "proposal_id" },
  { table: "commercial_proposal_calibration_points", zip: "propostas/calibration_points.json", parentTable: "commercial_proposal_scales", parentFk: "scale_id" },
  { table: "document_revisions", zip: "lista_mestra/revisions.json", parentTable: "master_documents", parentFk: "master_document_id" },
  { table: "document_distributions", zip: "lista_mestra/distributions.json", parentTable: "master_documents", parentFk: "master_document_id" },
  { table: "document_template_links", zip: "lista_mestra/template_links.json", parentTable: "master_documents", parentFk: "master_document_id" },
  { table: "document_generated_snapshots", zip: "lista_mestra/snapshots.json", parentTable: "master_documents", parentFk: "master_document_id" },
  { table: "document_access_rules", zip: "lista_mestra/access_rules.json", parentTable: "master_documents", parentFk: "master_document_id" },
  { table: "calibration_certificate_points", zip: "certificados/calibration_points.json", parentTable: "calibration_certificates", parentFk: "certificate_id" },
  { table: "calibration_certificate_standards", zip: "certificados/calibration_standards.json", parentTable: "calibration_certificates", parentFk: "certificate_id" },
  { table: "calibration_certificate_environmental", zip: "certificados/calibration_environmental.json", parentTable: "calibration_certificates", parentFk: "certificate_id" },
  { table: "calibration_certificate_conformity", zip: "certificados/calibration_conformity.json", parentTable: "calibration_certificates", parentFk: "certificate_id" },
  { table: "calibration_certificate_reviews", zip: "certificados/calibration_reviews.json", parentTable: "calibration_certificates", parentFk: "certificate_id" },
  { table: "weight_calibration_certificate_items", zip: "certificados/weight_items.json", parentTable: "weight_calibration_certificates", parentFk: "certificate_id" },
  { table: "weight_calibration_certificate_standards", zip: "certificados/weight_standards.json", parentTable: "weight_calibration_certificates", parentFk: "certificate_id" },
  { table: "weight_calibration_certificate_environmental", zip: "certificados/weight_environmental.json", parentTable: "weight_calibration_certificates", parentFk: "certificate_id" },
  { table: "weight_calibration_certificate_reviews", zip: "certificados/weight_reviews.json", parentTable: "weight_calibration_certificates", parentFk: "certificate_id" },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function recordBackupEvent(
  admin: SupabaseClient,
  payload: {
    tenant_id: string;
    action: string;
    outcome?: string;
    source?: string;
    restore_mode?: string | null;
    filename?: string;
    storage_path?: string;
    size_bytes?: number;
    record_count?: number;
    sha256?: string;
    manifest_version?: string;
    error_message?: string;
    details?: Record<string, unknown>;
    actor_user_id?: string | null;
  },
) {
  let actor_email = "";
  let actor_full_name = "";
  let actor_role = "";
  if (payload.actor_user_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", payload.actor_user_id)
      .maybeSingle();
    actor_email = profile?.email || "";
    actor_full_name = profile?.full_name || "";
    actor_role = profile?.role || "";
  }

  const { error } = await admin.from("tenant_backup_events").insert({
    tenant_id: payload.tenant_id,
    action: payload.action,
    outcome: payload.outcome || "success",
    source: payload.source || "manual",
    restore_mode: payload.restore_mode ?? null,
    filename: payload.filename || "",
    storage_path: payload.storage_path || "",
    size_bytes: payload.size_bytes || 0,
    record_count: payload.record_count || 0,
    sha256: payload.sha256 || "",
    manifest_version: payload.manifest_version || "",
    error_message: payload.error_message || "",
    details: payload.details || {},
    actor_user_id: payload.actor_user_id || null,
    actor_email,
    actor_full_name,
    actor_role,
  });
  if (error && !/does not exist|schema cache/i.test(error.message)) {
    console.error("[tenant-backup] event insert failed:", error.message);
  }
}

async function purgeExpiredBackups(
  admin: SupabaseClient,
  tenantId: string,
  retentionDays: number,
  actorUserId: string | null,
): Promise<number> {
  const days = Math.max(7, retentionDays || DEFAULT_RETENTION_DAYS);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const { data: objects } = await admin.storage.from(BACKUP_BUCKET).list(tenantId, {
    limit: 200,
    sortBy: { column: "created_at", order: "asc" },
  });
  const expired = (objects || []).filter((o) => {
    const ts = o.created_at || o.updated_at;
    if (!ts) return false;
    return new Date(ts).getTime() < cutoff;
  });
  if (!expired.length) return 0;

  const paths = expired.flatMap((o) => {
    const base = `${tenantId}/${o.name}`;
    return o.name.endsWith(".zip") ? [base, `${base}.sha256`] : [base];
  });
  for (const chunk of chunkArray(paths, 50)) {
    await admin.storage.from(BACKUP_BUCKET).remove(chunk);
  }

  await recordBackupEvent(admin, {
    tenant_id: tenantId,
    action: "purge",
    outcome: "success",
    source: "manual",
    record_count: expired.length,
    actor_user_id: actorUserId,
    details: {
      retention_days: days,
      purged: expired.map((o) => o.name),
    },
  });
  return expired.length;
}

async function authGate(
  req: Request,
  tenantId: string,
): Promise<
  | { error: Response }
  | { admin: SupabaseClient; userId: string | null; userEmail: string }
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
    .select("id, role, tenant_id, email")
    .eq("id", user.id)
    .single();

  const p = profile as (Profile & { email?: string }) | null;
  if (!p) return { error: jsonResponse({ error: "Forbidden" }, 403) };

  // Alinhado à UI: backup é módulo CTLI admin-only
  if (p.role !== "admin") {
    return { error: jsonResponse({ error: "Forbidden" }, 403) };
  }

  const serviceKey = getServiceRoleKey();
  return {
    admin: createClient(supabaseUrl, serviceKey),
    userId: user.id,
    userEmail: p.email || user.email || "",
  };
}

/** Reautenticação Part 11-ish: exige senha atual do ator para restore destrutivo. */
async function verifyActorPassword(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}

async function fetchAllPaged(
  admin: SupabaseClient,
  table: string,
  // deno-lint-ignore no-explicit-any
  applyFilter: (q: any) => any,
): Promise<{ rows: Record<string, unknown>[]; expected: number | null; truncated: boolean; error?: string }> {
  const { count, error: cErr } = await applyFilter(
    admin.from(table).select("*", { count: "exact", head: true }),
  );
  if (cErr) {
    // Tabela pode não existir em ambientes sem migration — skip graceful
    if (/does not exist|schema cache/i.test(cErr.message)) {
      return { rows: [], expected: 0, truncated: false, error: cErr.message };
    }
    throw new Error(`Count ${table}: ${cErr.message}`);
  }
  const expected = count ?? 0;
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await applyFilter(
      admin.from(table).select("*"),
    ).range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (/does not exist|schema cache/i.test(error.message)) {
        return { rows: [], expected: 0, truncated: false, error: error.message };
      }
      throw new Error(`Export ${table}: ${error.message}`);
    }
    if (!data?.length) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) break;
  }
  return {
    rows,
    expected,
    truncated: expected != null && rows.length !== expected,
  };
}

async function fetchByTenant(
  admin: SupabaseClient,
  table: string,
  tenantId: string,
) {
  return fetchAllPaged(admin, table, (q) => q.eq("tenant_id", tenantId));
}

async function fetchByParentIds(
  admin: SupabaseClient,
  table: string,
  fk: string,
  parentIds: string[],
): Promise<{ rows: Record<string, unknown>[]; truncated: boolean; error?: string }> {
  if (!parentIds.length) return { rows: [], truncated: false };
  const rows: Record<string, unknown>[] = [];
  let anyTrunc = false;
  for (const ids of chunkArray(parentIds, IN_CHUNK)) {
    const res = await fetchAllPaged(admin, table, (q) => q.in(fk, ids));
    if (res.error && /does not exist|schema cache/i.test(res.error)) {
      return { rows: [], truncated: false, error: res.error };
    }
    rows.push(...res.rows);
    if (res.truncated) anyTrunc = true;
  }
  return { rows, truncated: anyTrunc };
}

function naturalKeyOf(row: Record<string, unknown>, keys: string[]): string {
  return keys.map((k) => String(row[k] ?? "")).join("\0");
}

/**
 * Resolve IDs no merge: se a chave natural já existe no tenant, reutiliza o id
 * vivo; caso contrário gera UUID novo. Devolve só as linhas a inserir.
 * Chaves com algum campo vazio não fazem match (ex.: code '' na lista mestra).
 */
function resolveMergeNaturalKeys(
  rows: Record<string, unknown>[],
  liveRows: Record<string, unknown>[],
  keys: string[],
  idMap: Map<string, string>,
): Record<string, unknown>[] {
  const liveByKey = new Map<string, string>();
  for (const r of liveRows) {
    const id = r.id as string | undefined;
    if (!id) continue;
    if (keys.some((k) => String(r[k] ?? "") === "")) continue;
    liveByKey.set(naturalKeyOf(r, keys), id);
  }

  const toInsert: Record<string, unknown>[] = [];
  for (const row of rows) {
    const oldId = row.id as string | undefined;
    const hasEmptyKey = keys.some((k) => String(row[k] ?? "") === "");
    if (!hasEmptyKey) {
      const key = naturalKeyOf(row, keys);
      const existing = liveByKey.get(key);
      if (existing) {
        if (oldId) idMap.set(oldId, existing);
        continue;
      }
    }
    const newId = crypto.randomUUID();
    if (oldId) idMap.set(oldId, newId);
    const copy = { ...row, id: newId };
    toInsert.push(copy);
    if (!hasEmptyKey) {
      liveByKey.set(naturalKeyOf(copy, keys), newId);
    }
  }
  return toInsert;
}

/** Remove ou anula FKs que não existem no conjunto válido (evita 23503 no merge). */
function sanitizeFkRows(
  rows: Record<string, unknown>[],
  fkField: string,
  validIds: Set<string>,
  opts: { nullable: boolean } = { nullable: false },
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const row of rows) {
    const fk = row[fkField];
    if (fk == null || fk === "") {
      out.push(row);
      continue;
    }
    if (validIds.has(String(fk))) {
      out.push(row);
      continue;
    }
    if (opts.nullable) {
      out.push({ ...row, [fkField]: null });
    }
    // NOT NULL FK órfã → descarta a linha
  }
  return out;
}

async function loadIdSet(
  admin: SupabaseClient,
  table: string,
  tenantId: string,
): Promise<Set<string>> {
  const live = await fetchByTenant(admin, table, tenantId);
  return new Set(
    (live.error ? [] : live.rows).map((r) => String(r.id)).filter(Boolean),
  );
}

async function insertChunked(
  admin: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (!rows.length) return 0;
  let inserted = 0;
  for (const chunk of chunkArray(rows, INSERT_CHUNK)) {
    const { error } = await admin.from(table).insert(chunk);
    if (!error) {
      inserted += chunk.length;
      continue;
    }
    if (/does not exist|schema cache/i.test(error.message)) return inserted;
    // Unique / FK pontuais: tenta linha a linha e salta conflitos de unique
    if (/duplicate key|unique constraint/i.test(error.message)) {
      for (const row of chunk) {
        const { error: rowErr } = await admin.from(table).insert(row);
        if (!rowErr) {
          inserted += 1;
          continue;
        }
        if (/duplicate key|unique constraint/i.test(rowErr.message)) {
          console.warn(`[tenant-backup] skip duplicate ${table}:`, rowErr.message);
          continue;
        }
        if (/does not exist|schema cache/i.test(rowErr.message)) continue;
        throw new Error(`${table}: ${rowErr.message}`);
      }
      continue;
    }
    throw new Error(`${table}: ${error.message}`);
  }
  return inserted;
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

async function removeStoragePrefix(admin: SupabaseClient, bucket: string, prefix: string) {
  const files = await listStoragePrefix(admin, bucket, `${prefix}/`);
  if (!files.length) return;
  for (const chunk of chunkArray(files.map((f) => `${prefix}/${f.path}`), 100)) {
    await admin.storage.from(bucket).remove(chunk);
  }
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
    for (const doc of documents as { id?: string; files?: { name?: string; url?: string }[] }[]) {
      if (!doc?.id || !Array.isArray(doc.files)) continue;
      for (const f of doc.files) {
        if (!f?.url || !f?.name) continue;
        try {
          const fr = await fetch(f.url);
          if (fr.ok) {
            files.push({ docId: doc.id, name: f.name, data: new Uint8Array(await fr.arrayBuffer()) });
          }
        } catch { /* skip */ }
      }
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
): Promise<{
  zipBytes: Uint8Array;
  manifest: Record<string, unknown>;
  recordCount: number;
  archiveSha256: string;
  integrityDoc: Record<string, unknown>;
}> {
  const zip = new JSZip();

  const { data: tenant, error: tErr } = await admin.from("tenants").select("*").eq("id", tenantId).single();
  if (tErr || !tenant) throw new Error("Tenant não encontrado");
  zip.file("tenant.json", JSON.stringify(tenant, null, 2));

  const exportedByTable: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};
  const expectedCounts: Record<string, number | null> = {};
  const truncatedTables: string[] = [];
  const skippedTables: string[] = [];

  for (const spec of TENANT_TABLES) {
    const res = await fetchByTenant(admin, spec.table, tenantId);
    if (res.error && /does not exist|schema cache/i.test(res.error)) {
      skippedTables.push(spec.table);
      exportedByTable[spec.table] = [];
      counts[spec.table] = 0;
      continue;
    }
    exportedByTable[spec.table] = res.rows;
    counts[spec.table] = res.rows.length;
    expectedCounts[spec.table] = res.expected;
    if (res.truncated) truncatedTables.push(spec.table);
    zip.file(spec.zip, JSON.stringify(res.rows, null, 2));
  }

  for (const spec of CHILD_TABLES) {
    const parents = exportedByTable[spec.parentTable] || [];
    const parentIds = parents.map((r) => r.id as string).filter(Boolean);
    const res = await fetchByParentIds(admin, spec.table, spec.parentFk, parentIds);
    if (res.error && /does not exist|schema cache/i.test(res.error)) {
      skippedTables.push(spec.table);
      exportedByTable[spec.table] = [];
      counts[spec.table] = 0;
      continue;
    }
    exportedByTable[spec.table] = res.rows;
    counts[spec.table] = res.rows.length;
    if (res.truncated) truncatedTables.push(spec.table);
    zip.file(spec.zip, JSON.stringify(res.rows, null, 2));
  }

  let storageFileCount = 0;
  for (const bucket of [CADASTRO_BUCKET, BRANDING_BUCKET, DOCUMENTS_BUCKET]) {
    const files = await listStoragePrefix(admin, bucket, `${tenantId}/`);
    for (const f of files) {
      zip.file(`storage/${bucket}/${f.path}`, f.data);
      storageFileCount++;
    }
  }

  const legacy = await fetchLegacyDocuments(tenantId, authHeader);
  if (legacy.available) {
    zip.file("legacy/documents.json", JSON.stringify(legacy.documents, null, 2));
    zip.file("legacy/reminders.json", JSON.stringify(legacy.reminders, null, 2));
    for (const f of legacy.files) {
      zip.file(`legacy/files/documents/${f.docId}/${f.name}`, f.data);
    }
  }

  const recordCount = Object.values(counts).reduce((a, b) => a + b, 0) +
    storageFileCount +
    (legacy.documents?.length || 0);

  const manifest = {
    version: MANIFEST_VERSION,
    tenant_id: tenantId,
    tenant_name: tenant.name,
    created_at: new Date().toISOString(),
    source,
    legacy_api_available: legacy.available,
    pagination: { page_size: PAGE_SIZE },
    counts: {
      ...counts,
      storage_files: storageFileCount,
      legacy_documents: legacy.documents?.length || 0,
      legacy_reminders: legacy.reminders?.length || 0,
      total_records: recordCount,
    },
    expected_counts: expectedCounts,
    truncated_tables: truncatedTables,
    skipped_tables: skippedTables,
    integrity: {
      exported_equals_expected: truncatedTables.length === 0,
      algorithm: "SHA-256",
    },
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // Digests dos ficheiros (exceto integrity.json) antes de fechar o ZIP
  const fileDigests: Record<string, string> = {};
  for (const path of Object.keys(zip.files)) {
    const entry = zip.files[path];
    if (!entry || entry.dir) continue;
    const data = new Uint8Array(await entry.async("uint8array"));
    fileDigests[path] = await sha256Hex(data);
  }
  const integrityDoc = {
    version: MANIFEST_VERSION,
    algorithm: "SHA-256",
    created_at: manifest.created_at,
    tenant_id: tenantId,
    files: fileDigests,
  };
  zip.file("integrity.json", JSON.stringify(integrityDoc, null, 2));

  const zipBytes = new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
  const archiveSha256 = await sha256Hex(zipBytes);
  return { zipBytes, manifest, recordCount, archiveSha256, integrityDoc };
}

async function uploadBackupZip(
  admin: SupabaseClient,
  tenantId: string,
  filename: string,
  zipBytes: Uint8Array,
  archiveSha256: string,
): Promise<{ storage_path: string; download_url: string }> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storage_path = `${tenantId}/${stamp}-${filename}`;
  const { error: upErr } = await admin.storage
    .from(BACKUP_BUCKET)
    .upload(storage_path, zipBytes, {
      contentType: "application/zip",
      upsert: false,
    });
  if (upErr) throw new Error(`Upload backup: ${upErr.message}`);

  await admin.storage
    .from(BACKUP_BUCKET)
    .upload(`${storage_path}.sha256`, new TextEncoder().encode(archiveSha256), {
      contentType: "text/plain",
      upsert: true,
    });

  const { data: signed, error: sErr } = await admin.storage
    .from(BACKUP_BUCKET)
    .createSignedUrl(storage_path, SIGNED_URL_TTL_SEC);
  if (sErr || !signed?.signedUrl) {
    throw new Error(`Signed URL: ${sErr?.message || "falhou"}`);
  }
  return { storage_path, download_url: signed.signedUrl };
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
    const copy = { ...row } as T;
    if (copy.id) {
      const newId = crypto.randomUUID();
      idMap.set(copy.id, newId);
      copy.id = newId;
    }
    return copy;
  });
}

function remapRowFks(row: Record<string, unknown>, idMap: Map<string, string>) {
  for (const [k, v] of Object.entries(row)) {
    if (typeof v !== "string") continue;
    if ((k === "id" || k.endsWith("_id")) && idMap.has(v)) {
      row[k] = idMap.get(v);
    }
  }
}

async function resolveParentIds(
  admin: SupabaseClient,
  parentTable: string,
  tenantId: string,
): Promise<string[]> {
  if (TENANT_TABLES.some((t) => t.table === parentTable)) {
    const res = await fetchByTenant(admin, parentTable, tenantId);
    return res.rows.map((r) => r.id as string).filter(Boolean);
  }
  const childParent = CHILD_TABLES.find((c) => c.table === parentTable);
  if (childParent) {
    const grandIds = await resolveParentIds(admin, childParent.parentTable, tenantId);
    const mid = await fetchByParentIds(admin, parentTable, childParent.parentFk, grandIds);
    return mid.rows.map((r) => r.id as string).filter(Boolean);
  }
  return [];
}

async function deleteTenantData(admin: SupabaseClient, tenantId: string) {
  // Filhos primeiro (inclui netos, ex.: pontos de proposta → scales → proposals)
  for (const spec of [...CHILD_TABLES].reverse()) {
    const ids = await resolveParentIds(admin, spec.parentTable, tenantId);
    for (const chunk of chunkArray(ids, IN_CHUNK)) {
      if (!chunk.length) continue;
      const { error } = await admin.from(spec.table).delete().in(spec.parentFk, chunk);
      if (error && !/does not exist|schema cache/i.test(error.message)) {
        throw new Error(`Delete ${spec.table}: ${error.message}`);
      }
    }
  }

  // Tabelas tenant em ordem inversa
  for (const spec of [...TENANT_TABLES].reverse()) {
    if (spec.table === "employee_registrations") {
      await admin.from("employee_registrations")
        .update({ supervisor_id: null, position_id: null })
        .eq("tenant_id", tenantId);
    }
    const { error } = await admin.from(spec.table).delete().eq("tenant_id", tenantId);
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      throw new Error(`Delete ${spec.table}: ${error.message}`);
    }
  }

  for (const bucket of [CADASTRO_BUCKET, BRANDING_BUCKET, DOCUMENTS_BUCKET]) {
    await removeStoragePrefix(admin, bucket, tenantId);
  }
}

async function verifyZipIntegrity(zip: JSZip): Promise<{
  ok: boolean;
  checked: number;
  mismatches: string[];
  hasIntegrityFile: boolean;
}> {
  const integrityFile = zip.file("integrity.json");
  if (!integrityFile) {
    return { ok: true, checked: 0, mismatches: [], hasIntegrityFile: false };
  }
  const integrity = JSON.parse(await integrityFile.async("string")) as {
    files?: Record<string, string>;
  };
  const expected = integrity.files || {};
  const mismatches: string[] = [];
  let checked = 0;
  for (const [path, want] of Object.entries(expected)) {
    if (path === "integrity.json") continue;
    const entry = zip.file(path);
    if (!entry || entry.dir) {
      mismatches.push(path);
      continue;
    }
    const data = new Uint8Array(await entry.async("uint8array"));
    const got = await sha256Hex(data);
    checked += 1;
    if (got !== want) mismatches.push(path);
  }
  return {
    ok: mismatches.length === 0,
    checked,
    mismatches,
    hasIntegrityFile: true,
  };
}

async function dryRunRestore(
  admin: SupabaseClient,
  tenantId: string,
  zipBytes: Uint8Array,
): Promise<Record<string, unknown>> {
  const archiveSha256 = await sha256Hex(zipBytes);
  const zip = await JSZip.loadAsync(zipBytes);
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("ZIP inválido: manifest.json ausente");

  const manifest = JSON.parse(await manifestFile.async("string"));
  if (manifest.tenant_id !== tenantId) {
    throw new Error("O backup pertence a outro ambiente");
  }

  const integrityCheck = await verifyZipIntegrity(zip);
  if (integrityCheck.hasIntegrityFile && !integrityCheck.ok) {
    throw new Error(
      `Integridade SHA-256 falhou em ${integrityCheck.mismatches.length} ficheiro(s): ${
        integrityCheck.mismatches.slice(0, 5).join(", ")
      }`,
    );
  }

  const readJson = async (path: string): Promise<unknown[]> => {
    const f = zip.file(path);
    if (!f) return [];
    const raw = JSON.parse(await f.async("string"));
    return Array.isArray(raw) ? raw : [];
  };

  const zip_counts: Record<string, number> = {};
  const live_counts: Record<string, number | null> = {};
  const deltas: Record<string, { zip: number; live: number | null; delta: number | null }> = {};
  const warnings: string[] = [];

  for (const spec of TENANT_TABLES) {
    const rows = await readJson(spec.zip);
    zip_counts[spec.table] = rows.length;
    const live = await fetchByTenant(admin, spec.table, tenantId);
    live_counts[spec.table] = live.error ? null : (live.expected ?? live.rows.length);
    const liveN = live_counts[spec.table];
    deltas[spec.table] = {
      zip: rows.length,
      live: liveN,
      delta: liveN == null ? null : rows.length - liveN,
    };
  }

  for (const spec of CHILD_TABLES) {
    const rows = await readJson(spec.zip);
    zip_counts[spec.table] = rows.length;
  }

  if (!integrityCheck.hasIntegrityFile) {
    warnings.push("ZIP sem integrity.json — verificação de conteúdo limitada (versão anterior ao v3).");
  }
  if (String(manifest.version || "") < "3") {
    warnings.push(`Manifest versão ${manifest.version || "?"} — preferir backup v3+.`);
  }

  const storagePaths = Object.keys(zip.files).filter((p) => p.startsWith("storage/") && !zip.files[p].dir);
  zip_counts.storage_files = storagePaths.length;

  const zipTotal = Object.values(zip_counts).reduce((a, b) => a + b, 0);
  const liveTotal = Object.values(live_counts).reduce<number>(
    (a, b) => a + (typeof b === "number" ? b : 0),
    0,
  );

  return {
    dry_run: true,
    would_write: false,
    sha256: archiveSha256,
    manifest_version: String(manifest.version || ""),
    integrity_verified: integrityCheck.hasIntegrityFile && integrityCheck.ok,
    integrity_files_checked: integrityCheck.checked,
    zip_counts,
    live_counts,
    deltas,
    zip_total_records: zipTotal,
    live_total_records: liveTotal,
    warnings,
    replace_impact:
      "Modo SUBSTITUIR apagaria os dados cobertos do ambiente e inseriria o conteúdo do ZIP. Um backup automático pre-replace será gerado antes.",
    merge_impact:
      "Modo MERGE acrescenta registos com novos IDs. Linhas com a mesma chave natural (ex.: opções de pessoal, códigos de cadastro, nº de pedido) reutilizam o registo já existente em vez de duplicar.",
  };
}

async function createPreReplaceSafetyBackup(
  admin: SupabaseClient,
  tenantId: string,
  authHeader: string | null,
  userId: string | null,
): Promise<{ storage_path: string; sha256: string; size_bytes: number; filename: string }> {
  const { zipBytes, recordCount, archiveSha256 } = await buildBackupZip(
    admin,
    tenantId,
    "pre_replace",
    authHeader,
  );
  const filename = `pre-replace-${tenantId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.zip`;
  const { storage_path } = await uploadBackupZip(admin, tenantId, filename, zipBytes, archiveSha256);
  await recordBackupEvent(admin, {
    tenant_id: tenantId,
    action: "pre_replace_backup",
    outcome: "success",
    source: "auto",
    filename,
    storage_path,
    size_bytes: zipBytes.length,
    record_count: recordCount,
    sha256: archiveSha256,
    manifest_version: MANIFEST_VERSION,
    actor_user_id: userId,
    details: { purpose: "safety_before_replace" },
  });
  return { storage_path, sha256: archiveSha256, size_bytes: zipBytes.length, filename };
}

async function restoreFromZip(
  admin: SupabaseClient,
  tenantId: string,
  zipBytes: Uint8Array,
  replace: boolean,
  authHeader: string | null,
): Promise<Record<string, number | string | boolean>> {
  const archiveSha256 = await sha256Hex(zipBytes);
  const zip = await JSZip.loadAsync(zipBytes);
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("ZIP inválido: manifest.json ausente");

  const manifest = JSON.parse(await manifestFile.async("string"));
  if (manifest.tenant_id !== tenantId) {
    throw new Error("O backup pertence a outro ambiente");
  }

  const integrityCheck = await verifyZipIntegrity(zip);
  if (integrityCheck.hasIntegrityFile && !integrityCheck.ok) {
    throw new Error(
      `Integridade SHA-256 falhou em ${integrityCheck.mismatches.length} ficheiro(s): ${
        integrityCheck.mismatches.slice(0, 5).join(", ")
      }`,
    );
  }

  const readJson = async (path: string): Promise<Record<string, unknown>[]> => {
    const f = zip.file(path);
    if (!f) return [];
    const raw = JSON.parse(await f.async("string"));
    return Array.isArray(raw) ? raw : [];
  };

  if (replace) {
    await deleteTenantData(admin, tenantId);
  }

  const idMap = new Map<string, string>();
  const dataByTable: Record<string, Record<string, unknown>[]> = {};

  for (const spec of TENANT_TABLES) {
    dataByTable[spec.table] = await readJson(spec.zip);
  }
  for (const spec of CHILD_TABLES) {
    dataByTable[spec.table] = await readJson(spec.zip);
  }

  if (!replace) {
    const naturalTenant = new Map(MERGE_NATURAL_KEYS.map((s) => [s.table, s.keys]));
    const naturalChild = new Map(MERGE_CHILD_NATURAL_KEYS.map((s) => [s.table, s.keys]));

    // 1) Tabelas com chave natural: reutilizar ids existentes no tenant
    for (const spec of TENANT_TABLES) {
      const keys = naturalTenant.get(spec.table);
      if (!keys) continue;
      const live = await fetchByTenant(admin, spec.table, tenantId);
      if (spec.table === "calibration_schedule_overrides") continue;
      let liveRows = live.error ? [] : live.rows;
      // Unique de certificado só cobre status ativos — preferir esses no match
      if (
        spec.table === "calibration_certificates" ||
        spec.table === "weight_calibration_certificates"
      ) {
        liveRows = liveRows.filter(
          (r) => !["cancelado", "substituido", "obsoleto"].includes(String(r.status || "")),
        );
      }
      dataByTable[spec.table] = resolveMergeNaturalKeys(
        dataByTable[spec.table] || [],
        liveRows,
        keys,
        idMap,
      );
    }

    // 2) Restantes tabelas tenant: novos UUIDs
    for (const spec of TENANT_TABLES) {
      if (naturalTenant.has(spec.table)) continue;
      dataByTable[spec.table] = remapIds(dataByTable[spec.table] || [], idMap);
    }

    // 2b) Overrides: ainda com ids originais — só remapear FKs (source_id) antes da chave natural
    for (const row of dataByTable.calibration_schedule_overrides || []) {
      remapRowFks(row, idMap);
    }

    // 3) Filhos: novos UUIDs (exceto os com chave natural — resolvidos após remap de FKs)
    for (const spec of CHILD_TABLES) {
      if (naturalChild.has(spec.table)) continue;
      dataByTable[spec.table] = remapIds(dataByTable[spec.table] || [], idMap);
    }

    // 4) Remapear FKs (*_id) para os novos/reutilizados
    for (const rows of Object.values(dataByTable)) {
      for (const row of rows) remapRowFks(row, idMap);
    }

    // 5) Filhos com unique composto (já com FK remapeada): reutilizar ou inserir
    for (const spec of CHILD_TABLES) {
      const keys = naturalChild.get(spec.table);
      if (!keys) continue;
      const parentIds: string[] = [];
      for (const newId of idMap.values()) parentIds.push(newId);
      for (const r of dataByTable[spec.parentTable] || []) {
        if (r.id) parentIds.push(r.id as string);
      }
      const uniqueParentIds = [...new Set(parentIds)];
      const liveKids = await fetchByParentIds(
        admin,
        spec.table,
        spec.parentFk,
        uniqueParentIds,
      );
      dataByTable[spec.table] = resolveMergeNaturalKeys(
        dataByTable[spec.table] || [],
        liveKids.error ? [] : liveKids.rows,
        keys,
        idMap,
      );
    }

    // 6) Overrides de calendário (dependem de source_id já remapeado)
    {
      const keys = naturalTenant.get("calibration_schedule_overrides");
      if (keys) {
        const live = await fetchByTenant(admin, "calibration_schedule_overrides", tenantId);
        dataByTable.calibration_schedule_overrides = resolveMergeNaturalKeys(
          dataByTable.calibration_schedule_overrides || [],
          live.error ? [] : live.rows,
          keys,
          idMap,
        );
      }
    }
  }

  let restored = 0;

  // Employees: insert without position_id first, then positions, then update positions
  const employees = (dataByTable.employee_registrations || []).map((r) => ({
    ...r,
    tenant_id: tenantId,
    position_id: null,
  }));
  const employeeOriginalPositions = (await readJson("cadastros/employees.json")).map((r) => {
    const id = replace ? (r.id as string) : idMap.get(r.id as string);
    const position_id = replace
      ? r.position_id
      : (r.position_id && idMap.has(r.position_id as string) ? idMap.get(r.position_id as string) : r.position_id);
    return { id, position_id };
  });

  for (const spec of TENANT_TABLES) {
    if (spec.table === "employee_registrations") {
      const sorted = sortEmployeesForInsert(employees);
      restored += await insertChunked(admin, spec.table, sorted);
      continue;
    }
    if (spec.table === "personnel_positions") {
      restored += await insertChunked(
        admin,
        spec.table,
        (dataByTable[spec.table] || []).map((r) => ({ ...r, tenant_id: tenantId })),
      );
      for (const ep of employeeOriginalPositions) {
        if (!ep.id || !ep.position_id) continue;
        await admin.from("employee_registrations").update({ position_id: ep.position_id }).eq("id", ep.id);
      }
      continue;
    }

    const rows = (dataByTable[spec.table] || []).map((r) => {
      const copy = { ...r, tenant_id: tenantId };
      if (spec.table === "purchase_orders") {
        copy.client_environment_id = tenantId;
      }
      // FK circular: collections ↔ certificates — repor certificate_id depois
      if (spec.table === "weight_calibration_collections") {
        copy.certificate_id = null;
      }
      // Self-FK: inserir primeiro sem replaces, atualizar depois
      if (
        spec.table === "calibration_certificates" ||
        spec.table === "weight_calibration_certificates"
      ) {
        copy.replaces_certificate_id = null;
      }
      delete copy.created_at;
      delete copy.updated_at;
      return copy;
    });

    // FK para pai já inserido/reutilizado — evita 23503 no merge idempotente
    const fkSan = TENANT_FK_SANITIZE.find((s) => s.table === spec.table);
    if (fkSan) {
      const validParents = await loadIdSet(admin, fkSan.parentTable, tenantId);
      restored += await insertChunked(
        admin,
        spec.table,
        sanitizeFkRows(rows, fkSan.fk, validParents, { nullable: fkSan.nullable }),
      );
      continue;
    }

    restored += await insertChunked(admin, spec.table, rows);
  }

  // Repor FKs circulares / self-ref
  for (const row of dataByTable.weight_calibration_collections || []) {
    if (!row.id || !row.certificate_id) continue;
    await admin.from("weight_calibration_collections")
      .update({ certificate_id: row.certificate_id })
      .eq("id", row.id as string);
  }
  for (const table of ["calibration_certificates", "weight_calibration_certificates"] as const) {
    for (const row of dataByTable[table] || []) {
      if (!row.id || !row.replaces_certificate_id) continue;
      await admin.from(table)
        .update({ replaces_certificate_id: row.replaces_certificate_id })
        .eq("id", row.id as string);
    }
  }

  // IDs de pais já presentes no tenant (merge) + acabados de inserir
  const validParentCache = new Map<string, Set<string>>();
  async function validParentIds(parentTable: string): Promise<Set<string>> {
    if (validParentCache.has(parentTable)) return validParentCache.get(parentTable)!;
    const set = await loadIdSet(admin, parentTable, tenantId);
    // Pais sem tenant_id (filhos de filhos): usar ids remapeados + inseridos
    if (set.size === 0 && !TENANT_TABLES.some((t) => t.table === parentTable)) {
      for (const r of dataByTable[parentTable] || []) {
        if (r.id) set.add(String(r.id));
      }
      for (const id of idMap.values()) set.add(id);
    }
    validParentCache.set(parentTable, set);
    return set;
  }

  for (const spec of CHILD_TABLES) {
    let rows = (dataByTable[spec.table] || []).map((r) => {
      const copy = { ...r };
      if ("tenant_id" in copy) copy.tenant_id = tenantId;
      delete copy.created_at;
      delete copy.updated_at;
      return copy;
    });
    const validParents = await validParentIds(spec.parentTable);
    rows = sanitizeFkRows(rows, spec.parentFk, validParents, { nullable: false });
    restored += await insertChunked(admin, spec.table, rows);
  }

  let storage_files_restored = 0;
  const storagePaths = Object.keys(zip.files).filter((p) => p.startsWith("storage/") && !zip.files[p].dir);
  for (const fullPath of storagePaths) {
    const parts = fullPath.split("/");
    if (parts.length < 3) continue;
    const bucket = parts[1];
    let relPath = parts.slice(2).join("/");
    if (bucket === DOCUMENTS_BUCKET && idMap.size > 0) {
      const segs = relPath.split("/");
      if (segs.length > 0 && idMap.has(segs[0])) {
        segs[0] = idMap.get(segs[0])!;
        relPath = segs.join("/");
      }
    }
    const storagePath = `${tenantId}/${relPath}`;
    const f = zip.file(fullPath);
    if (!f) continue;
    const data = await f.async("uint8array");
    await admin.storage.from(bucket).upload(storagePath, data, { upsert: true });
    storage_files_restored++;
  }

  const legacyCounts = await restoreLegacy(admin, tenantId, zip, replace, authHeader);

  return {
    records_restored: restored,
    storage_files_restored,
    documents_restored: (dataByTable.tenant_documents?.length || 0) + legacyCounts.documents_restored,
    responsibles_restored: dataByTable.responsibles?.length || 0,
    cadastros_restored: (dataByTable.supplier_registrations?.length || 0) +
      (dataByTable.end_customer_registrations?.length || 0) +
      (dataByTable.employee_registrations?.length || 0),
    coleta_restored: dataByTable.scale_calibration_collections?.length || 0,
    purchase_orders_restored: dataByTable.purchase_orders?.length || 0,
    certificates_restored: (dataByTable.calibration_certificates?.length || 0) +
      (dataByTable.weight_calibration_certificates?.length || 0),
    master_documents_restored: dataByTable.master_documents?.length || 0,
    legacy_api_available: Boolean(Deno.env.get("LEGACY_API_URL")),
    manifest_version: String(manifest.version || ""),
    sha256: archiveSha256,
    integrity_verified: integrityCheck.hasIntegrityFile,
    integrity_files_checked: integrityCheck.checked,
  };
}

async function restoreLegacy(
  admin: SupabaseClient,
  tenantId: string,
  zip: JSZip,
  replace: boolean,
  authHeader: string | null,
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
                headers: serviceToken
                  ? { Authorization: `Bearer ${serviceToken}` }
                  : (authHeader ? { Authorization: authHeader } : {}),
                body: fd,
              });
            }
          }
        }
        restored++;
      }
    } catch { /* skip */ }
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
      body = {
        action: (form.get("action") as string) || "restore",
        tenant_id: form.get("tenant_id") as string,
        replace: form.get("replace") === "true",
        confirm_password: form.get("confirm_password") as string,
        confirm_phrase: form.get("confirm_phrase") as string,
      };
    } else {
      body = await req.json();
    }

    const action = String(body.action || "").trim().toLowerCase();
    const tenantId = String(body.tenant_id || "").trim();
    if (!tenantId) return jsonResponse({ error: "tenant_id obrigatório" }, 400);

    const gate = await authGate(req, tenantId);
    if ("error" in gate) return gate.error;
    const { admin, userId, userEmail } = gate;
    const authHeader = req.headers.get("Authorization");

    const knownActions = ["list", "create", "download", "dry_run", "restore"];
    if (action && !knownActions.includes(action)) {
      return jsonResponse({
        error: `Ação desconhecida: ${action}. Ações válidas: ${knownActions.join(", ")}. Se acabou de atualizar o código, confirme o deploy: supabase functions deploy tenant-backup`,
      }, 400);
    }

    if (action === "list") {
      const { data: tenant, error } = await admin
        .from("tenants")
        .select("last_backup_at, auto_interval_days, backup_retention_days")
        .eq("id", tenantId)
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);

      const retentionDays = tenant?.backup_retention_days ?? DEFAULT_RETENTION_DAYS;
      const purged = await purgeExpiredBackups(admin, tenantId, retentionDays, userId);

      const { data: objects } = await admin.storage.from(BACKUP_BUCKET).list(tenantId, {
        limit: 30,
        sortBy: { column: "created_at", order: "desc" },
      });

      const backups = (objects || [])
        .filter((o) => o.name?.endsWith(".zip"))
        .map((o) => ({
          name: o.name,
          storage_path: `${tenantId}/${o.name}`,
          size_bytes: o.metadata?.size ?? null,
          created_at: o.created_at || o.updated_at || null,
        }));

      const { data: events } = await admin
        .from("tenant_backup_events")
        .select("id, action, outcome, source, restore_mode, filename, size_bytes, record_count, sha256, manifest_version, actor_email, actor_full_name, error_message, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(40);

      return jsonResponse({
        backups,
        events: events || [],
        storage_mode: "storage_signed",
        last_backup_at: tenant?.last_backup_at ?? null,
        auto_interval_days: tenant?.auto_interval_days ?? 20,
        backup_retention_days: retentionDays,
        purged_expired: purged,
      });
    }

    if (action === "create") {
      try {
        const { zipBytes, manifest, recordCount, archiveSha256 } = await buildBackupZip(
          admin,
          tenantId,
          "manual",
          authHeader,
        );

        if (manifest.truncated_tables && (manifest.truncated_tables as string[]).length) {
          await recordBackupEvent(admin, {
            tenant_id: tenantId,
            action: "create",
            outcome: "failure",
            actor_user_id: userId,
            error_message: "Export truncado",
            details: { truncated_tables: manifest.truncated_tables },
          });
          return jsonResponse({
            error: `Export incompleto (truncado): ${(manifest.truncated_tables as string[]).join(", ")}. Tente novamente.`,
            truncated_tables: manifest.truncated_tables,
            expected_counts: manifest.expected_counts,
            counts: manifest.counts,
          }, 409);
        }

        const filename = `backup-${tenantId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.zip`;
        const created_at = new Date().toISOString();
        const { storage_path, download_url } = await uploadBackupZip(
          admin,
          tenantId,
          filename,
          zipBytes,
          archiveSha256,
        );

        await admin
          .from("tenants")
          .update({ last_backup_at: created_at })
          .eq("id", tenantId);

        const { data: tenantMeta } = await admin
          .from("tenants")
          .select("backup_retention_days")
          .eq("id", tenantId)
          .maybeSingle();
        const purged = await purgeExpiredBackups(
          admin,
          tenantId,
          tenantMeta?.backup_retention_days ?? DEFAULT_RETENTION_DAYS,
          userId,
        );

        await recordBackupEvent(admin, {
          tenant_id: tenantId,
          action: "create",
          outcome: "success",
          source: "manual",
          filename,
          storage_path,
          size_bytes: zipBytes.length,
          record_count: recordCount,
          sha256: archiveSha256,
          manifest_version: MANIFEST_VERSION,
          actor_user_id: userId,
          details: {
            counts: manifest.counts,
            skipped_tables: manifest.skipped_tables,
            purged_expired: purged,
          },
        });

        return jsonResponse({
          filename,
          created_at,
          doc_count: recordCount,
          size_bytes: zipBytes.length,
          sha256: archiveSha256,
          storage_path,
          download_url,
          download_expires_in: SIGNED_URL_TTL_SEC,
          legacy_api_available: manifest.legacy_api_available,
          storage_mode: "storage_signed",
          counts: manifest.counts,
          skipped_tables: manifest.skipped_tables,
          purged_expired: purged,
        });
      } catch (e) {
        await recordBackupEvent(admin, {
          tenant_id: tenantId,
          action: "create",
          outcome: "failure",
          actor_user_id: userId,
          error_message: String(e),
        });
        throw e;
      }
    }

    if (action === "download") {
      const storagePath = String(body.storage_path || "");
      if (!storagePath.startsWith(`${tenantId}/`)) {
        return jsonResponse({ error: "storage_path inválido" }, 400);
      }
      const { data: signed, error: sErr } = await admin.storage
        .from(BACKUP_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
      if (sErr || !signed?.signedUrl) {
        return jsonResponse({ error: sErr?.message || "Falha ao assinar URL" }, 500);
      }
      await recordBackupEvent(admin, {
        tenant_id: tenantId,
        action: "download",
        outcome: "success",
        storage_path: storagePath,
        actor_user_id: userId,
      });
      return jsonResponse({
        download_url: signed.signedUrl,
        download_expires_in: SIGNED_URL_TTL_SEC,
        storage_path: storagePath,
      });
    }

    if (action === "dry_run") {
      if (!zipFile) return jsonResponse({ error: "Arquivo ZIP obrigatório" }, 400);
      const zipBytes = new Uint8Array(await zipFile.arrayBuffer());
      try {
        const report = await dryRunRestore(admin, tenantId, zipBytes);
        await recordBackupEvent(admin, {
          tenant_id: tenantId,
          action: "dry_run",
          outcome: "success",
          source: "manual",
          filename: zipFile.name || "",
          size_bytes: zipBytes.length,
          record_count: Number(report.zip_total_records || 0),
          sha256: String(report.sha256 || ""),
          manifest_version: String(report.manifest_version || ""),
          actor_user_id: userId,
          details: {
            warnings: report.warnings,
            integrity_verified: report.integrity_verified,
            zip_total_records: report.zip_total_records,
            live_total_records: report.live_total_records,
          },
        });
        return jsonResponse(report);
      } catch (e) {
        const msg = String(e);
        const isIntegrity = /Integridade SHA-256/i.test(msg);
        await recordBackupEvent(admin, {
          tenant_id: tenantId,
          action: isIntegrity ? "verify_fail" : "dry_run",
          outcome: "failure",
          filename: zipFile.name || "",
          size_bytes: zipBytes.length,
          sha256: await sha256Hex(zipBytes),
          actor_user_id: userId,
          error_message: msg,
        });
        throw e;
      }
    }

    if (action === "restore") {
      if (!zipFile) return jsonResponse({ error: "Arquivo ZIP obrigatório" }, 400);
      const replace = body.replace === true || body.replace === "true";
      const zipBytes = new Uint8Array(await zipFile.arrayBuffer());

      if (replace) {
        const phrase = String(body.confirm_phrase || "").trim().toUpperCase();
        if (phrase !== "SUBSTITUIR") {
          return jsonResponse({
            error: 'Confirmação incompleta: digite SUBSTITUIR para o modo substituir.',
          }, 400);
        }
        const password = String(body.confirm_password || "");
        const ok = await verifyActorPassword(userEmail, password);
        if (!ok) {
          await recordBackupEvent(admin, {
            tenant_id: tenantId,
            action: "reauth_fail",
            outcome: "failure",
            restore_mode: "replace",
            filename: zipFile.name || "",
            size_bytes: zipBytes.length,
            actor_user_id: userId,
            error_message: "Reautenticação falhou",
          });
          return jsonResponse({
            error: "Reautenticação falhou. Confirme a senha do utilizador administrador.",
          }, 401);
        }
      }

      try {
        let pre_replace: Record<string, unknown> | null = null;
        if (replace) {
          pre_replace = await createPreReplaceSafetyBackup(admin, tenantId, authHeader, userId);
        }

        const counts = await restoreFromZip(admin, tenantId, zipBytes, replace, authHeader);
        await recordBackupEvent(admin, {
          tenant_id: tenantId,
          action: "restore",
          outcome: "success",
          source: "manual",
          restore_mode: replace ? "replace" : "merge",
          filename: zipFile.name || "",
          size_bytes: zipBytes.length,
          record_count: Number(counts.records_restored || 0),
          sha256: String(counts.sha256 || ""),
          manifest_version: String(counts.manifest_version || ""),
          actor_user_id: userId,
          details: {
            ...counts,
            reauth: replace,
            pre_replace_backup: pre_replace,
          },
        });
        return jsonResponse({
          ...counts,
          reauth_ok: replace,
          pre_replace_backup: pre_replace,
        });
      } catch (e) {
        const msg = String(e);
        const isIntegrity = /Integridade SHA-256/i.test(msg);
        await recordBackupEvent(admin, {
          tenant_id: tenantId,
          action: isIntegrity ? "verify_fail" : "restore",
          outcome: "failure",
          restore_mode: replace ? "replace" : "merge",
          filename: zipFile.name || "",
          size_bytes: zipBytes.length,
          sha256: await sha256Hex(zipBytes),
          actor_user_id: userId,
          error_message: msg,
        });
        throw e;
      }
    }

    return jsonResponse({
      error: `Ação desconhecida: ${action || "(vazia)"}. Use list, create, download, dry_run ou restore.`,
    }, 400);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
