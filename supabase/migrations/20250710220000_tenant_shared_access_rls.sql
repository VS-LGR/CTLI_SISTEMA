-- Partilha no mesmo ambiente: RLS por tenant_id, não por papel legado nem por criador.
-- A ACL granular (módulos/pastas) continua a ser aplicada no frontend.

-- Coleta / OS: antes só client + tecnico_campo viam dados do tenant.
CREATE OR REPLACE FUNCTION public.coleta_access(tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.cadastro_tenant_access(tid);
$$;

COMMENT ON FUNCTION public.coleta_access(uuid) IS
  'Acesso às coleções de calibração: qualquer utilizador autenticado do mesmo tenant (ou admin CTLI).';

-- Lembretes da dashboard: criar/editar no ambiente (não só role client).
CREATE OR REPLACE FUNCTION public.dashboard_reminder_manage(tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.cadastro_tenant_access(tid);
$$;

COMMENT ON FUNCTION public.dashboard_reminder_manage(uuid) IS
  'Gestão de lembretes: utilizadores do mesmo tenant (ou admin CTLI). Delete continua a exigir autor ou admin.';

-- Metadados de backup do ambiente: qualquer conta do tenant (ACL/UI restringe quem vê o ecrã).
CREATE OR REPLACE FUNCTION public.backup_tenant_access(tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.cadastro_tenant_access(tid);
$$;

COMMENT ON FUNCTION public.backup_tenant_access(uuid) IS
  'Acesso a runs de backup do tenant: mesmo ambiente ou admin CTLI.';

NOTIFY pgrst, 'reload schema';
