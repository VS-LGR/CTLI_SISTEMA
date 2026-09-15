import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user?.email) return json(401, { error: "Unauthorized" });

    const body = await req.json();
    const password = String(body.password || "");
    const action = String(body.action || "");
    const meaning = String(body.meaning || "").trim();

    if (!password) return json(400, { error: "Senha obrigatória para assinatura eletrónica." });
    if (!meaning) {
      return json(400, { error: "Declare o significado da assinatura (aprovação ou emissão)." });
    }

    const { error: reauthErr } = await userClient.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (reauthErr) {
      return json(401, { error: "Senha inválida. Assinatura eletrónica recusada." });
    }

    if (action === "approve_scale") {
      const ids: string[] = Array.isArray(body.certificate_ids) ? body.certificate_ids : [];
      if (!ids.length) return json(400, { error: "certificate_ids obrigatório" });
      const { data, error } = await userClient.rpc("approve_calibration_certificates", {
        p_certificate_ids: ids,
        p_notes: meaning,
      });
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true, approved: Number(data) || 0 });
    }

    if (action === "approve_weight") {
      const ids: string[] = Array.isArray(body.certificate_ids) ? body.certificate_ids : [];
      if (!ids.length) return json(400, { error: "certificate_ids obrigatório" });
      const { data, error } = await userClient.rpc("approve_weight_calibration_certificates", {
        p_certificate_ids: ids,
        p_notes: meaning,
      });
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true, approved: Number(data) || 0 });
    }

    if (action === "emit_scale") {
      const id = String(body.certificate_id || "");
      if (!id) return json(400, { error: "certificate_id obrigatório" });
      const { error } = await userClient.rpc("emit_calibration_certificate", {
        p_id: id,
        p_fields: body.fields || {},
      });
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true });
    }

    if (action === "emit_weight") {
      const id = String(body.certificate_id || "");
      if (!id) return json(400, { error: "certificate_id obrigatório" });
      const { error } = await userClient.rpc("emit_weight_calibration_certificate", {
        p_id: id,
        p_fields: body.fields || {},
      });
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true });
    }

    return json(400, { error: `Ação desconhecida: ${action}` });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
