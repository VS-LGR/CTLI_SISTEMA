import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const EDGE_FN_GENERIC = /failed to send a request to the edge function|cors|preflight|networkerror|net::err_failed/i;
const NOT_FOUND_FN = /not found|404|requested function/i;

function supabasePublicKey() {
  return (
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
}

function deployHint(functionName) {
  return (
    `A função "${functionName}" não está publicada ou não responde ao browser (CORS). ` +
    "Publique-a: .\\scripts\\deploy-edge-functions.ps1 (ou npx supabase functions deploy send-calibration-certificate). " +
    "Confirme supabase/config.toml com verify_jwt = false para esta função. " +
    "Depois, em Edge Functions → Secrets: CTLI_SERVICE_ROLE_KEY, RESEND_API_KEY e RESEND_FROM_EMAIL."
  );
}

/**
 * Invoca Edge Function via fetch (erros HTTP mais claros que functions.invoke).
 */
export async function invokeSupabaseEdgeFunction(functionName, body) {
  if (!supabase) throw new Error("Supabase não configurado (REACT_APP_SUPABASE_URL e chave pública).");

  const baseUrl = (process.env.REACT_APP_SUPABASE_URL || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("REACT_APP_SUPABASE_URL em falta.");

  const apikey = supabasePublicKey();
  if (!apikey) throw new Error("REACT_APP_SUPABASE_ANON_KEY ou REACT_APP_SUPABASE_PUBLISHABLE_KEY em falta.");

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const url = `${baseUrl}/functions/v1/${functionName}`;
  // #region agent log
  fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'supabaseFunctions.js:invoke:start',message:'edge invoke start',data:{functionName,baseUrl,hasToken:Boolean(token),bodyKeys:Object.keys(body||{})},timestamp:Date.now(),hypothesisId:'H1-H5'})}).catch(()=>{});
  // #endregion
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    });
  } catch (netErr) {
    const msg = netErr?.message || String(netErr);
    // #region agent log
    fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'supabaseFunctions.js:invoke:netErr',message:'edge fetch network error',data:{functionName,msg},timestamp:Date.now(),hypothesisId:'H1-H4'})}).catch(()=>{});
    // #endregion
    if (EDGE_FN_GENERIC.test(msg)) throw new Error(deployHint(functionName));
    throw new Error(`${msg} ${deployHint(functionName)}`);
  }

  let data = null;
  const text = await res.text();
  // #region agent log
  fetch('http://127.0.0.1:7299/ingest/7b244137-7f40-4eba-9295-132edf0400d6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0cb612'},body:JSON.stringify({sessionId:'0cb612',location:'supabaseFunctions.js:invoke:response',message:'edge fetch response',data:{functionName,status:res.status,ok:res.ok,textPreview:text.slice(0,120)},timestamp:Date.now(),hypothesisId:'H1-H3'})}).catch(()=>{});
  // #endregion
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 200) };
    }
  }

  if (res.status === 404 || NOT_FOUND_FN.test(text)) {
    throw new Error(deployHint(functionName));
  }

  if (!res.ok) {
    const errMsg = data?.error
      ? (typeof data.error === "string" ? data.error : JSON.stringify(data.error))
      : `HTTP ${res.status}`;
    if (res.status === 401) throw new Error(`${errMsg} Verifique se está autenticado.`);
    if (res.status === 500 && /service_role|SUPABASE_SERVICE_ROLE/i.test(text)) {
      throw new Error(`${errMsg} Defina CTLI_SERVICE_ROLE_KEY nos segredos da Edge Function.`);
    }
    throw new Error(errMsg);
  }

  if (data?.error) {
    throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  }

  return data;
}

export async function fnErrorMessage(data, error) {
  if (data?.error) return typeof data.error === "string" ? data.error : JSON.stringify(data.error);
  if (error?.context && typeof error.context.json === "function") {
    try {
      const b = await error.context.json();
      if (b?.error) return typeof b.error === "string" ? b.error : JSON.stringify(b.error);
    } catch {
      /* ignore */
    }
  }
  return error?.message || "Falha";
}

/** Mensagem amigável para falhas de invoke, com hint de deploy quando aplicável. */
export async function formatEdgeFunctionError(data, error, functionName) {
  const base = await fnErrorMessage(data, error);
  if (EDGE_FN_GENERIC.test(base)) {
    const fn = functionName || "a Edge Function";
    return `${base} Publique ${fn} no Supabase (supabase functions deploy) e confirme CTLI_SERVICE_ROLE_KEY nos segredos da função.`;
  }
  return base;
}

export function toastSupabaseAccessError(e, fallback) {
  const detail = e?.response?.data?.detail;
  const fromDetail = typeof detail === "string" ? detail : "";
  const msg = fromDetail || e?.message || String(e || "") || fallback;
  const rls = /permission denied|row-level security|\bRLS\b|42501/i.test(msg);
  const hint = rls
    ? " Confirme que a sessão é de administrador CTLI (profiles.role = 'admin')."
    : "";
  toast.error(`${msg}${hint}`);
}
