-- Backup apenas local (ZIP no PC): remove histórico na nuvem e cron automático.
-- Execute no SQL Editor UM bloco de cada vez (ver comentários no ficheiro 20250623100000).

-- ========== BLOCO 1 — desagendar backup automático na nuvem ==========
DO $cron$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'tenant-backup-auto-daily';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $cron$;

-- ========== BLOCO 2 — remover tabela de backups guardados no Supabase ==========
DROP TABLE IF EXISTS public.tenant_backup_runs CASCADE;

-- ========== BLOCO 3 — funções do cron (já não usadas) ==========
DROP FUNCTION IF EXISTS public.invoke_tenant_backup_auto();
DROP FUNCTION IF EXISTS public.tenants_needing_auto_backup();
DROP FUNCTION IF EXISTS public.backup_tenant_access(uuid);

-- Mantém em public.tenants: last_backup_at, auto_interval_days (lembrete na UI).
-- O bucket tenant-backups pode ficar vazio; pode apagá-lo manualmente em Storage se quiser.
