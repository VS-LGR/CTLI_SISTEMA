import { invokeSupabaseEdgeFunction } from "@/lib/supabaseFunctions";

/**
 * Reautentica com senha e executa ação crítica (aprovação/emissão).
 * @param {{ action: string, password: string, meaning: string, certificate_ids?: string[], certificate_id?: string, fields?: object }} body
 */
export async function invokeCriticalEsign(body) {
  return invokeSupabaseEdgeFunction("critical-esign", body);
}
