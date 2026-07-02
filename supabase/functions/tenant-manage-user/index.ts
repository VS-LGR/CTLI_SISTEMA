import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getServiceRoleKey } from "../_shared/env.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TENANT_ADMIN_CREATABLE_ROLES = new Set([
  "tecnico_campo",
  "signatario",
  "administrativo_vendas",
  "gerente_qualidade",
  "gerente_tecnico",
  "diretor",
]);

const CTLI_CREATABLE_ROLES = new Set([
  "admin",
  "client",
  "tecnico_campo",
  "signatario",
  "diretor",
  "gerente_qualidade",
  "gerente_tecnico",
  "administrativo_vendas",
]);

function allowedRolesForProvisioner(role: string): Set<string> {
  if (role === "admin") return CTLI_CREATABLE_ROLES;
  if (role === "client") return TENANT_ADMIN_CREATABLE_ROLES;
  return new Set();
}

async function requireProvisioner(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "client")) {
    return {
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const serviceKey = getServiceRoleKey();
  const adminClient = createClient(supabaseUrl, serviceKey);

  return { user, profile, adminClient };
}

function resolveTenantId(
  profile: { role: string; tenant_id: string | null },
  bodyTenantId: string | undefined,
): string | null {
  if (profile.role === "client") return profile.tenant_id;
  return bodyTenantId || null;
}

function assertRoleAllowed(provisionerRole: string, targetRole: string) {
  const allowed = allowedRolesForProvisioner(provisionerRole);
  if (!allowed.has(targetRole)) {
    throw new Error(`Nível de acesso não permitido: ${targetRole}`);
  }
}

async function assertTargetInTenant(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  tenantId: string,
  provisioner: { role: string; tenant_id: string | null },
) {
  const { data: target } = await adminClient
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", userId)
    .single();

  if (!target) throw new Error("Utilizador não encontrado");
  if (target.tenant_id !== tenantId) throw new Error("Forbidden");
  if (provisioner.role === "client") {
    if (target.role === "admin" || target.role === "client") {
      throw new Error("Não pode gerir administradores do ambiente");
    }
  }
  return target;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const gate = await requireProvisioner(req);
    if ("error" in gate && gate.error) return gate.error;

    const { user, profile, adminClient } = gate;
    const body = await req.json();
    const action = body.action as string;

    if (action === "create") {
      const {
        email,
        password,
        full_name,
        role,
        tenant_id: bodyTenantId,
        employee_registration_id,
      } = body;
      const tenant_id = resolveTenantId(profile, bodyTenantId);

      if (!email || !password || !full_name || !role) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatórios: email, password, full_name, role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!tenant_id) {
        return new Response(
          JSON.stringify({ error: "tenant_id obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      try {
        assertRoleAllowed(profile.role, role);
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (role === "signatario" && !employee_registration_id) {
        return new Response(JSON.stringify({ error: "Colaborador signatário obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role, tenant_id },
      });

      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const profilePatch: Record<string, unknown> = {
        full_name,
        email,
        role,
        tenant_id,
        updated_at: new Date().toISOString(),
      };
      if (employee_registration_id) profilePatch.employee_registration_id = employee_registration_id;

      const { error: upErr } = await adminClient
        .from("profiles")
        .update(profilePatch)
        .eq("id", newUser.user.id);

      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ id: newUser.user.id, email: newUser.user.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "update") {
      const { user_id, full_name, email, password, role, employee_registration_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: target } = await adminClient
        .from("profiles")
        .select("role, tenant_id")
        .eq("id", user_id)
        .single();

      if (!target) {
        return new Response(JSON.stringify({ error: "Utilizador não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (profile.role === "client" && target.tenant_id !== profile.tenant_id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const nextRole = role || target.role;
      try {
        assertRoleAllowed(profile.role, nextRole);
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (profile.role === "client" && (target.role === "admin" || target.role === "client")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (email) {
        const { error: eu } = await adminClient.auth.admin.updateUserById(user_id, { email });
        if (eu) {
          return new Response(JSON.stringify({ error: eu.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (password) {
        const { error: pu } = await adminClient.auth.admin.updateUserById(user_id, { password });
        if (pu) {
          return new Response(JSON.stringify({ error: pu.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (full_name !== undefined) patch.full_name = full_name;
      if (email) patch.email = email;
      if (role) patch.role = role;
      if (nextRole === "signatario" && employee_registration_id) {
        patch.employee_registration_id = employee_registration_id;
      }
      if (nextRole !== "signatario") patch.employee_registration_id = null;

      const { error: upErr } = await adminClient.from("profiles").update(patch).eq("id", user_id);
      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (user_id === user.id) {
        return new Response(JSON.stringify({ error: "Não pode excluir a própria conta" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tenantId = profile.role === "client" ? profile.tenant_id : body.tenant_id;
      try {
        await assertTargetInTenant(adminClient, user_id, tenantId, profile);
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: delErr } = await adminClient.auth.admin.deleteUser(user_id);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action inválida (create|update|delete)" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
