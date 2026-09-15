import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Desativa conta (ban + perfil) em vez de apagar — REQ-F-ER contas lógicas. */
export async function disableAuthUser(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  actorId: string,
  reason: string,
) {
  const { error: banErr } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });
  if (banErr) throw new Error(banErr.message);

  const { error: profErr } = await adminClient
    .from("profiles")
    .update({
      is_disabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (profErr) throw new Error(profErr.message);

  await adminClient.from("admin_sensitive_actions").insert({
    actor_id: actorId,
    action: "disable_user",
    target_user_id: userId,
    details: { reason },
  });
}
