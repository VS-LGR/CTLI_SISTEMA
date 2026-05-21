/** Service role: no painel use CTLI_SERVICE_ROLE_KEY (valor de Settings → API → service_role). */
export function getServiceRoleKey(): string {
  const key =
    Deno.env.get("CTLI_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) {
    throw new Error(
      "Segredo em falta: defina CTLI_SERVICE_ROLE_KEY nos segredos da Edge Function (valor service_role da API).",
    );
  }
  return key;
}
