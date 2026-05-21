import { toast } from "sonner";

const EDGE_FN_GENERIC = /failed to send a request to the edge function/i;

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
    return `${base} Publique ${fn} no Supabase (supabase functions deploy) e confirme SUPABASE_SERVICE_ROLE_KEY nos segredos da função.`;
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
