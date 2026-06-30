import { invokeSupabaseEdgeFunction } from "@/lib/supabaseFunctions";
import { emitCertificate } from "@/lib/calibrationCertificates/certificateApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || "").trim());
}

/** Resolve e-mail do cliente: cadastro vivo ou snapshot técnico. */
export function resolveClientEmail(cert, endCustomers = []) {
  const live = endCustomers.find((c) => c.id === cert?.end_customer_id);
  if (live?.email && isValidEmail(live.email)) {
    return { email: live.email.trim(), source: "cadastro" };
  }
  const snap = cert?.technical_snapshot?.clientSnapshot?.email
    || cert?.technical_snapshot?.client_snapshot?.email;
  if (snap && isValidEmail(snap)) {
    return { email: String(snap).trim(), source: "snapshot" };
  }
  return { email: "", source: "none" };
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao codificar PDF"));
        return;
      }
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Falha ao ler PDF"));
    reader.readAsDataURL(blob);
  });
}

export async function buildCertificatePdfForEmail(
  cert,
  tenantName,
  { tenant, logoDataUrl, documentMeta, fileName } = {},
) {
  console.warn("[cert-email] pdf step: start", {
    certId: cert?.id,
    hasPreMeta: Boolean(documentMeta),
    hasPreFileName: Boolean(fileName),
  });
  // #region agent log
  fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'certificateEmailApi.js:pdf_start',message:'pdf build start',data:{certId:cert?.id,hasPreMeta:Boolean(documentMeta),hasPreFileName:Boolean(fileName)},timestamp:Date.now(),hypothesisId:'H1-H3'})}).catch(()=>{});
  // #endregion

  try {
    const { exportCertificatePdfBlob } = await import("@/lib/certificateExport");
    console.warn("[cert-email] pdf step: export module loaded");
    // #region agent log
    fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'certificateEmailApi.js:pdf_module',message:'export module loaded',data:{certId:cert?.id},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    const { blob, fileName: outName } = await exportCertificatePdfBlob(cert, tenantName, {
      logoDataUrl,
      tenant,
      cancelled: cert.status === "cancelado",
      documentMeta,
      fileName,
      compressForEmail: true,
    });
    console.warn("[cert-email] pdf step: blob ready", { fileName: outName, pdfKb: Math.round(blob.size / 1024) });
    // #region agent log
    fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'certificateEmailApi.js:pdf_blob',message:'pdf blob ready',data:{certId:cert?.id,pdfKb:Math.round(blob.size/1024),fileName:outName},timestamp:Date.now(),hypothesisId:'H3-H4'})}).catch(()=>{});
    // #endregion

    if (blob.size > 4 * 1024 * 1024) {
      const mb = Math.round((blob.size / (1024 * 1024)) * 10) / 10;
      throw new Error(`PDF muito grande para envio por e-mail (${mb} MB; máx. 4 MB).`);
    }
    return { blob, fileName: outName };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("[cert-email] pdf step: failed", msg);
    // #region agent log
    fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'certificateEmailApi.js:pdf_error',message:'pdf build failed',data:{certId:cert?.id,errMsg:msg},timestamp:Date.now(),hypothesisId:'H1-H4'})}).catch(()=>{});
    // #endregion
    throw err;
  }
}

export async function sendCertificateByEmail(
  cert,
  {
    tenant,
    tenantName = "",
    logoDataUrl,
    recipientEmail,
    endCustomers = [],
    documentMeta,
    fileName,
  } = {},
) {
  const resolved = recipientEmail?.trim()
    ? { email: recipientEmail.trim(), source: "manual" }
    : resolveClientEmail(cert, endCustomers);
  if (!resolved.email) {
    throw new Error("E-mail do cliente não cadastrado. Atualize em Cadastros → Clientes.");
  }

  console.warn("[cert-email] send start", { certId: cert.id, recipientDomain: resolved.email.split("@")[1] });
  const { blob, fileName: pdfName } = await buildCertificatePdfForEmail(cert, tenantName || tenant?.name || "", {
    tenant,
    logoDataUrl,
    documentMeta,
    fileName,
  });
  const pdfBase64 = await blobToBase64(blob);
  console.warn("[cert-email] PDF ready", { fileName: pdfName, pdfKb: Math.round(blob.size / 1024), b64Len: pdfBase64.length });

  // #region agent log
  fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'certificateEmailApi.js:pre_invoke',message:'calling edge send',data:{certId:cert.id,tenantId:tenant?.id||cert.tenant_id,pdfLen:pdfBase64.length,recipientDomain:(resolved.email.split('@')[1]||'')},timestamp:Date.now(),hypothesisId:'H8-H10'})}).catch(()=>{});
  // #endregion

  console.warn("[cert-email] edge invoke start", { certId: cert.id });
  try {
    const result = await invokeSupabaseEdgeFunction("send-calibration-certificate", {
      action: "send",
      certificateId: cert.id,
      tenantId: tenant?.id || cert.tenant_id,
      pdfBase64,
      fileName: pdfName,
      recipientEmail: resolved.email,
    });
    console.warn("[cert-email] edge invoke ok", { certId: cert.id, status: result?.status });
    // #region agent log
    fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'certificateEmailApi.js:post_invoke',message:'edge send ok',data:{ok:Boolean(result?.ok),status:result?.status},timestamp:Date.now(),hypothesisId:'H8-H10'})}).catch(()=>{});
    // #endregion
    return result;
  } catch (err) {
    console.error("[cert-email] edge invoke failed", err?.message || err);
    // #region agent log
    fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'certificateEmailApi.js:invoke_error',message:'edge send failed',data:{errMsg:err?.message||String(err)},timestamp:Date.now(),hypothesisId:'H6-H10'})}).catch(()=>{});
    // #endregion
    throw err;
  }
}

export async function notifySignatoryPendingApproval(cert, { tenantId } = {}) {
  return invokeSupabaseEdgeFunction("send-calibration-certificate", {
    action: "notify",
    certificateId: cert.id,
    tenantId: tenantId || cert.tenant_id,
  });
}

/**
 * Emite oficialmente (se aprovado) e envia ao cliente por e-mail.
 * @returns certificado atualizado após envio
 */
export async function emitAndSendCertificate(
  cert,
  {
    userId,
    tenant,
    tenantName,
    logoDataUrl,
    endCustomers = [],
    recipientEmail,
    documentMeta,
    fileName,
  } = {},
) {
  let current = cert;
  console.warn("[cert-email] emitAndSend start", { certId: cert?.id, status: cert?.status });
  if (current.status === "aprovado") {
    console.warn("[cert-email] emitting certificate…");
    current = await emitCertificate(current.id, { userId, documentMeta, fileName });
    console.warn("[cert-email] emit done", { status: current?.status });
  } else if (!["emitido", "enviado"].includes(current.status)) {
    throw new Error(`Certificado não pode ser enviado no status: ${current.status}`);
  }

  console.warn("[cert-email] building PDF and invoking edge…");
  await sendCertificateByEmail(current, {
    tenant,
    tenantName,
    logoDataUrl,
    endCustomers,
    recipientEmail,
    documentMeta,
    fileName,
  });

  const { getCertificate } = await import("@/lib/calibrationCertificates/certificateApi");
  return getCertificate(current.id);
}

/** Envio sequencial com callback de progresso. */
export async function sendCertificatesByEmailBatch(
  certificateIds,
  {
    loadCertificate,
    tenant,
    tenantName,
    logoDataUrl,
    endCustomers = [],
    onProgress,
  },
) {
  const results = [];
  for (let i = 0; i < certificateIds.length; i += 1) {
    const id = certificateIds[i];
    onProgress?.({ index: i + 1, total: certificateIds.length, certificateId: id, status: "loading" });
    try {
      const cert = await loadCertificate(id);
      const updated = await emitAndSendCertificate(cert, {
        tenant,
        tenantName,
        logoDataUrl,
        endCustomers,
      });
      results.push({ id, ok: true, cert: updated });
      onProgress?.({ index: i + 1, total: certificateIds.length, certificateId: id, status: "done" });
    } catch (err) {
      const message = err?.message || String(err);
      results.push({ id, ok: false, error: message });
      onProgress?.({ index: i + 1, total: certificateIds.length, certificateId: id, status: "error", error: message });
    }
  }
  return results;
}
