import { supabase } from "@/lib/supabaseClient";
import { isAclActive } from "@/lib/accessAcl";

/**
 * Dual-write de ACL após edge function (admin CTLI via RLS).
 * Garante que o formulário não volte ao preset do papel por perfil `{}`.
 */
export async function ensureProfileAccessAcl(userId, aclPayload, flags = {}) {
  if (!supabase || !userId) return { ok: false, skipped: true };

  const patch = {
    access_acl: aclPayload && typeof aclPayload === "object" ? aclPayload : {},
    access_coleta: Boolean(flags.access_coleta),
    access_certificados: Boolean(flags.access_certificados),
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (upErr) {
    if (/access_acl|schema cache|column/i.test(upErr.message || "")) {
      throw new Error(
        `${upErr.message} Aplique a migration profiles.access_acl no SQL Editor do Supabase e depois: NOTIFY pgrst, 'reload schema';`,
      );
    }
    // RLS (ex.: conta client no painel do tenant) — a edge function é a fonte da verdade.
    if (/permission denied|row-level security|42501/i.test(upErr.message || "")) {
      return { ok: false, skipped: true };
    }
    throw upErr;
  }

  if (aclPayload && Number(aclPayload.version) === 1) {
    const { data, error: selErr } = await supabase
      .from("profiles")
      .select("access_acl")
      .eq("id", userId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!isAclActive(data?.access_acl)) {
      throw new Error(
        "Liberações de acesso não ficaram gravadas. Aplique a migration access_acl e faça redeploy: "
        + ".\\scripts\\deploy-edge-functions.ps1",
      );
    }
  }

  return { ok: true };
}
