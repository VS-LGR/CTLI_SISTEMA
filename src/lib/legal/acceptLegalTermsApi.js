import { isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

const MOCK_LEGAL_KEY = "pv_legal_accepted";

/**
 * Persiste aceite EULA + Licença (RPC Supabase ou localStorage em mock).
 */
export async function acceptLegalTerms(version) {
  const v = String(version || "").trim();
  if (!v) throw new Error("Versão dos termos em falta");

  if (isMockApiMode || !isSupabaseAuthMode || !supabase) {
    localStorage.setItem(
      MOCK_LEGAL_KEY,
      JSON.stringify({ version: v, accepted_at: new Date().toISOString() }),
    );
    return { ok: true, mock: true };
  }

  const { error } = await supabase.rpc("accept_legal_terms", { p_version: v });
  if (error) throw new Error(error.message || "Falha ao registar aceite dos termos");
  return { ok: true };
}

/** Lê aceite mock (modo demo). */
export function readMockLegalAcceptance() {
  try {
    const raw = localStorage.getItem(MOCK_LEGAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearMockLegalAcceptance() {
  localStorage.removeItem(MOCK_LEGAL_KEY);
}
