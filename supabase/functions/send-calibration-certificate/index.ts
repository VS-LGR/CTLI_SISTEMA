import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getServiceRoleKey } from "../_shared/env.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SEND_ROLES = new Set([
  "admin",
  "client",
  "diretor",
  "gerente_qualidade",
  "gerente_tecnico",
  "administrativo_vendas",
  "signatario",
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const CONSUMER_MAIL_DOMAINS = /^(gmail|googlemail|hotmail|outlook|live|yahoo|icloud)\./i;

function normalizeResendFromEmail(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (isValidEmail(t)) return t;
  if (t === "onboarding") return "onboarding@resend.dev";
  return "";
}

function isResendSafeFromEmail(email: string): boolean {
  if (!isValidEmail(email)) return false;
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (domain === "resend.dev") return true;
  if (CONSUMER_MAIL_DOMAINS.test(domain)) return false;
  return true;
}

function resolveFromEmail(tenantBilling: string, envRaw: string): { email: string; source: string } {
  const env = normalizeResendFromEmail(envRaw);
  const tenant = tenantBilling.trim();
  if (tenant && isValidEmail(tenant) && isResendSafeFromEmail(tenant)) {
    return { email: tenant, source: "tenant_billing" };
  }
  if (env) return { email: env, source: "resend_env" };
  if (tenant && isValidEmail(tenant)) {
    return { email: tenant, source: "tenant_billing_unverified" };
  }
  return { email: "", source: "none" };
}

async function authGate(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
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
    .select("role, tenant_id, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "tecnico_campo") {
    return { error: jsonResponse({ error: "Forbidden" }, 403) };
  }

  const adminClient = createClient(supabaseUrl, getServiceRoleKey());
  return { user, profile, adminClient, supabaseUrl };
}

async function sendViaResend(payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachment?: { filename: string; content: string };
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada nos segredos da Edge Function");
  }

  const body: Record<string, unknown> = {
    from: payload.from,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
  };
  if (payload.attachment) {
    body.attachments = [{
      filename: payload.attachment.filename,
      content: payload.attachment.content,
    }];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string })?.message || `Resend HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as { id?: string };
}

async function resolveClientEmail(adminClient: ReturnType<typeof createClient>, cert: Record<string, unknown>) {
  const endCustomerId = cert.end_customer_id as string | null;
  if (endCustomerId) {
    const { data: customer } = await adminClient
      .from("end_customer_registrations")
      .select("email")
      .eq("id", endCustomerId)
      .maybeSingle();
    if (customer?.email && isValidEmail(customer.email)) {
      return customer.email.trim();
    }
  }
  const snap = cert.technical_snapshot as { clientSnapshot?: { email?: string } } | null;
  const fromSnap = snap?.clientSnapshot?.email;
  if (fromSnap && isValidEmail(fromSnap)) return fromSnap.trim();
  return "";
}

async function resolveSignatoryEmail(
  adminClient: ReturnType<typeof createClient>,
  signatoryId: string | null,
  tenantId: string,
) {
  if (!signatoryId) return "";

  const { data: employee } = await adminClient
    .from("employee_registrations")
    .select("email, full_name")
    .eq("id", signatoryId)
    .maybeSingle();

  if (employee?.email && isValidEmail(employee.email)) {
    return employee.email.trim();
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("email")
    .eq("tenant_id", tenantId)
    .eq("employee_registration_id", signatoryId)
    .maybeSingle();

  if (profile?.email && isValidEmail(profile.email)) {
    return profile.email.trim();
  }

  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const gate = await authGate(req);
    if ("error" in gate && gate.error) {
      return gate.error;
    }

    const { user, profile, adminClient } = gate;
    const body = await req.json();
    const action = String(body.action || "send");
    const tenantId = body.tenantId as string;

    if (!tenantId) {
      return jsonResponse({ error: "tenantId é obrigatório" }, 400);
    }

    if (profile.role !== "admin" && profile.tenant_id !== tenantId) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { data: tenant } = await adminClient
      .from("tenants")
      .select("name, certificate_email_from_name, billing_email")
      .eq("id", tenantId)
      .maybeSingle();

    const tenantFromEmail = String(tenant?.billing_email || "").trim();
    const fromResolved = resolveFromEmail(tenantFromEmail, Deno.env.get("RESEND_FROM_EMAIL") || "");
    if (!fromResolved.email) {
      return jsonResponse({
        error: "E-mail de envio não configurado. Use onboarding@resend.dev nos Secrets ou remova Gmail do ambiente.",
      }, 500);
    }
    const fromEmail = fromResolved.email;
    const fromName = tenant?.certificate_email_from_name || tenant?.name || "Calibração";
    const from = `${fromName} <${fromEmail}>`;

    // —— Lote ZIP ——
    if (action === "send_zip") {
      if (!SEND_ROLES.has(profile.role)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const certificateIds = Array.isArray(body.certificateIds)
        ? (body.certificateIds as string[]).filter(Boolean)
        : [];
      if (!certificateIds.length) {
        return jsonResponse({ error: "certificateIds é obrigatório" }, 400);
      }

      const zipBase64 = String(body.zipBase64 || "");
      const zipFileName = String(body.fileName || "certificados.zip");
      if (!zipBase64) {
        return jsonResponse({ error: "zipBase64 é obrigatório" }, 400);
      }

      const { data: certs, error: listErr } = await adminClient
        .from("calibration_certificates")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("id", certificateIds);

      if (listErr) throw listErr;
      if (!certs?.length) {
        return jsonResponse({ error: "Nenhum certificado encontrado" }, 404);
      }
      if (certs.length !== certificateIds.length) {
        return jsonResponse({ error: "Um ou mais certificados não pertencem a este ambiente" }, 400);
      }

      for (const c of certs) {
        if (!["aprovado", "emitido", "enviado"].includes(c.status)) {
          return jsonResponse({
            error: `Certificado ${c.certificate_number || c.id} com status inválido para envio: ${c.status}`,
          }, 400);
        }
      }

      let recipientEmail = String(body.recipientEmail || "").trim();
      if (!recipientEmail) {
        recipientEmail = await resolveClientEmail(adminClient, certs[0]);
      }
      if (!recipientEmail || !isValidEmail(recipientEmail)) {
        return jsonResponse({ error: "E-mail do cliente inválido ou não cadastrado" }, 400);
      }

      const clientLabel = certs[0].client_name || "Cliente";
      const n = certs.length;

      let resendData;
      try {
        resendData = await sendViaResend({
          from,
          to: recipientEmail,
          subject: `Lote de certificados (${n}) — ${clientLabel}`,
          html: `
            <p>Prezado(a),</p>
            <p>Segue em anexo o ficheiro ZIP com <strong>${n}</strong> certificado(s) de calibração.</p>
            <p>Cliente: <strong>${clientLabel}</strong>.</p>
            <p>Atenciosamente,<br/>${fromName}</p>
          `,
          attachment: { filename: zipFileName, content: zipBase64 },
        });
      } catch (sendErr) {
        const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
        await adminClient.from("certificate_email_deliveries").insert(
          certs.map((c) => ({
            certificate_id: c.id,
            tenant_id: tenantId,
            recipient: recipientEmail,
            status: "failed",
            error_message: errMsg,
            sent_by: user.id,
          })),
        );
        throw sendErr;
      }

      const now = new Date().toISOString();
      await adminClient.from("calibration_certificates").update({
        status: "enviado",
        client_email_sent_at: now,
        client_email_sent_to: recipientEmail,
        client_email_sent_by: user.id,
        updated_by: user.id,
        updated_at: now,
      }).in("id", certificateIds);

      await adminClient.from("certificate_email_deliveries").insert(
        certs.map((c) => ({
          certificate_id: c.id,
          tenant_id: tenantId,
          recipient: recipientEmail,
          resend_id: resendData.id || "",
          status: "sent",
          sent_by: user.id,
        })),
      );

      return jsonResponse({
        ok: true,
        resendId: resendData.id || "",
        recipient: recipientEmail,
        count: n,
        status: "enviado",
      });
    }

    const certificateId = body.certificateId as string;
    if (!certificateId) {
      return jsonResponse({ error: "certificateId é obrigatório" }, 400);
    }

    const { data: cert, error: certErr } = await adminClient
      .from("calibration_certificates")
      .select("*")
      .eq("id", certificateId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (certErr || !cert) {
      return jsonResponse({ error: "Certificado não encontrado" }, 404);
    }

    if (action === "notify") {
      if (cert.status !== "aguardando_aprovacao") {
        return jsonResponse({ error: "Certificado não está aguardando aprovação" }, 400);
      }

      const to = await resolveSignatoryEmail(adminClient, cert.signatory_id, tenantId);
      if (!to) {
        return jsonResponse({ ok: true, skipped: true, reason: "Signatário sem e-mail" });
      }

      const certLabel = cert.certificate_number
        ? `${cert.certificate_number}/${cert.certificate_year}`
        : certificateId.slice(0, 8);

      const resendData = await sendViaResend({
        from,
        to,
        subject: `Certificado aguardando aprovação — ${cert.client_name || "Cliente"}`,
        html: `
          <p>Olá,</p>
          <p>O certificado <strong>${certLabel}</strong> (${cert.client_name || "—"}, série ${cert.scale_serial || "—"}) aguarda sua aprovação.</p>
          <p>Acesse o sistema para revisar e aprovar.</p>
        `,
      });

      return jsonResponse({ ok: true, resendId: resendData.id || "", recipient: to });
    }

    if (action !== "send") {
      return jsonResponse({ error: "Ação inválida" }, 400);
    }

    if (!SEND_ROLES.has(profile.role)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    if (!["aprovado", "emitido", "enviado"].includes(cert.status)) {
      return jsonResponse({ error: `Status inválido para envio: ${cert.status}` }, 400);
    }

    const recipientEmail = String(body.recipientEmail || "").trim()
      || await resolveClientEmail(adminClient, cert);
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      return jsonResponse({ error: "E-mail do cliente inválido ou não cadastrado" }, 400);
    }

    const pdfBase64 = String(body.pdfBase64 || "");
    const fileName = String(body.fileName || `certificado-${cert.certificate_number || "doc"}.pdf`);
    if (!pdfBase64) {
      return jsonResponse({ error: "pdfBase64 é obrigatório" }, 400);
    }

    const certLabel = cert.certificate_number
      ? `${cert.certificate_number}/${cert.certificate_year}`
      : "certificado";

    let resendData;
    try {
      resendData = await sendViaResend({
        from,
        to: recipientEmail,
        subject: `Certificado de calibração ${certLabel} — ${cert.client_name || ""}`.trim(),
        html: `
          <p>Prezado(a),</p>
          <p>Segue em anexo o certificado de calibração <strong>${certLabel}</strong>.</p>
          <p>Instrumento: série <strong>${cert.scale_serial || "—"}</strong>.</p>
          <p>Atenciosamente,<br/>${fromName}</p>
        `,
        attachment: { filename: fileName, content: pdfBase64 },
      });
    } catch (sendErr) {
      await adminClient.from("certificate_email_deliveries").insert({
        certificate_id: certificateId,
        tenant_id: tenantId,
        recipient: recipientEmail,
        status: "failed",
        error_message: sendErr instanceof Error ? sendErr.message : String(sendErr),
        sent_by: user.id,
      });
      throw sendErr;
    }

    const now = new Date().toISOString();
    await adminClient.from("calibration_certificates").update({
      status: "enviado",
      client_email_sent_at: now,
      client_email_sent_to: recipientEmail,
      client_email_sent_by: user.id,
      updated_by: user.id,
      updated_at: now,
    }).eq("id", certificateId);

    await adminClient.from("certificate_email_deliveries").insert({
      certificate_id: certificateId,
      tenant_id: tenantId,
      recipient: recipientEmail,
      resend_id: resendData.id || "",
      status: "sent",
      sent_by: user.id,
    });

    return jsonResponse({
      ok: true,
      resendId: resendData.id || "",
      recipient: recipientEmail,
      status: "enviado",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});
