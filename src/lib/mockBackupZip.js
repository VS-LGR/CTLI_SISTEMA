/**
 * Backup ZIP real para modo mock (JSZip).
 */
import JSZip from "jszip";

const MANIFEST_VERSION = "1";

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function buildMockBackupZip(db, tenantId, source = "manual") {
  const zip = new JSZip();
  const tenant = (db.tenants || []).find((t) => t.id === tenantId) || { id: tenantId, name: "Tenant" };
  const responsibles = db.responsibles?.[tenantId] || [];
  const documents = (db.documents || []).filter((d) => d.tenant_id === tenantId);
  const reminders = db.dashboard_reminders?.[tenantId] || [];

  zip.file("tenant.json", JSON.stringify(tenant, null, 2));
  zip.file("responsibles.json", JSON.stringify(responsibles, null, 2));
  zip.file("legacy/documents.json", JSON.stringify(documents, null, 2));
  zip.file("legacy/reminders.json", JSON.stringify(reminders, null, 2));

  for (const doc of documents) {
    if (doc.has_file && doc.file_name) {
      const content = `Mock file content for ${doc.id}: ${doc.file_name}`;
      zip.file(`legacy/files/documents/${doc.id}/${doc.file_name}`, content);
    }
  }

  const manifest = {
    version: MANIFEST_VERSION,
    tenant_id: tenantId,
    tenant_name: tenant.name,
    created_at: new Date().toISOString(),
    source,
    legacy_api_available: true,
    counts: {
      responsibles: responsibles.length,
      documents: documents.length,
      reminders: reminders.length,
    },
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const buf = await blob.arrayBuffer();
  return {
    zipBase64: arrayBufferToBase64(buf),
    size_bytes: buf.byteLength,
    doc_count: responsibles.length + documents.length,
    manifest,
  };
}

export async function restoreMockBackupZip(db, tenantId, zipBase64, replace) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(zipBase64));
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("ZIP inválido");

  const manifest = JSON.parse(await manifestFile.async("string"));
  if (manifest.tenant_id !== tenantId) {
    throw new Error("O backup pertence a outro ambiente");
  }

  const readJson = async (path) => {
    const f = zip.file(path);
    if (!f) return [];
    return JSON.parse(await f.async("string"));
  };

  if (replace) {
    db.documents = (db.documents || []).filter((d) => d.tenant_id !== tenantId);
    db.responsibles[tenantId] = [];
    if (db.dashboard_reminders) db.dashboard_reminders[tenantId] = [];
  }

  const responsibles = await readJson("responsibles.json");
  const documents = await readJson("legacy/documents.json");
  const reminders = await readJson("legacy/reminders.json");

  if (!db.responsibles[tenantId]) db.responsibles[tenantId] = [];
  for (const r of responsibles) {
    if (!replace && db.responsibles[tenantId].some((x) => x.id === r.id)) continue;
    db.responsibles[tenantId].push({ ...r, tenant_id: tenantId });
  }

  for (const doc of documents) {
    if (!replace && (db.documents || []).some((d) => d.id === doc.id)) continue;
    db.documents.push({ ...doc, tenant_id: tenantId });
  }

  if (!db.dashboard_reminders) db.dashboard_reminders = {};
  if (!db.dashboard_reminders[tenantId]) db.dashboard_reminders[tenantId] = [];
  for (const rem of reminders) {
    if (!replace && db.dashboard_reminders[tenantId].some((x) => x.id === rem.id)) continue;
    db.dashboard_reminders[tenantId].push({ ...rem, tenant_id: tenantId });
  }

  return {
    documents_restored: documents.length,
    responsibles_restored: responsibles.length,
    cadastros_restored: 0,
    coleta_restored: 0,
    storage_files_restored: 0,
    legacy_api_available: true,
  };
}

export function zipBase64ToBlob(zipBase64) {
  const buf = base64ToArrayBuffer(zipBase64);
  return new Blob([buf], { type: "application/zip" });
}

export async function restoreMockBackupFromBlob(db, tenantId, fileOrBlob, replace) {
  const buf = await fileOrBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("ZIP inválido");

  const manifest = JSON.parse(await manifestFile.async("string"));
  if (manifest.tenant_id !== tenantId) {
    throw new Error("O backup pertence a outro ambiente");
  }

  const readJson = async (path) => {
    const f = zip.file(path);
    if (!f) return [];
    return JSON.parse(await f.async("string"));
  };

  if (replace) {
    db.documents = (db.documents || []).filter((d) => d.tenant_id !== tenantId);
    db.responsibles[tenantId] = [];
    if (db.dashboard_reminders) db.dashboard_reminders[tenantId] = [];
  }

  const responsibles = await readJson("responsibles.json");
  const documents = await readJson("legacy/documents.json");
  const reminders = await readJson("legacy/reminders.json");

  if (!db.responsibles[tenantId]) db.responsibles[tenantId] = [];
  for (const r of responsibles) {
    if (!replace && db.responsibles[tenantId].some((x) => x.id === r.id)) continue;
    db.responsibles[tenantId].push({ ...r, tenant_id: tenantId });
  }

  for (const doc of documents) {
    if (!replace && (db.documents || []).some((d) => d.id === doc.id)) continue;
    db.documents.push({ ...doc, tenant_id: tenantId });
  }

  if (!db.dashboard_reminders) db.dashboard_reminders = {};
  if (!db.dashboard_reminders[tenantId]) db.dashboard_reminders[tenantId] = [];
  for (const rem of reminders) {
    if (!replace && db.dashboard_reminders[tenantId].some((x) => x.id === rem.id)) continue;
    db.dashboard_reminders[tenantId].push({ ...rem, tenant_id: tenantId });
  }

  return {
    documents_restored: documents.length,
    responsibles_restored: responsibles.length,
    cadastros_restored: 0,
    coleta_restored: 0,
    storage_files_restored: 0,
    legacy_api_available: manifest.legacy_api_available !== false,
  };
}
