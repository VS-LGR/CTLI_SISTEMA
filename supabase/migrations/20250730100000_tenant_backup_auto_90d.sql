-- Backup automático a cada 90 dias (pg_cron + pg_net → Edge Function tenant-backup)
--
-- Pré-requisitos (Dashboard Supabase):
--   1. Extensões pg_cron e pg_net ativas (Database → Extensions).
--   2. Segredo Edge Function: BACKUP_CRON_SECRET (mesmo valor abaixo).
--   3. Configurar uma vez no SQL Editor (substituir URL e segredo):
--        ALTER DATABASE postgres SET app.settings.tenant_backup_function_url =
--          'https://SEU_REF.supabase.co/functions/v1/tenant-backup';
--        ALTER DATABASE postgres SET app.settings.backup_cron_secret = 'seu-segredo';
--
-- O job diário (03:00 UTC) só gera ZIP para tenants com last_backup_at nulo
-- ou mais antigo que auto_interval_days (default 90). Retenção de Storage:
-- tenants.backup_retention_days (default 90) — purga na Edge Function.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Intervalo automático: 90 dias
ALTER TABLE public.tenants
  ALTER COLUMN auto_interval_days SET DEFAULT 90;

UPDATE public.tenants
SET auto_interval_days = 90
WHERE auto_interval_days IS NULL
   OR auto_interval_days = 20;

COMMENT ON COLUMN public.tenants.auto_interval_days IS
  'Intervalo alvo (dias) entre backups; job diário gera cópia automática quando ultrapassado. Default 90.';

CREATE OR REPLACE FUNCTION public.tenants_needing_auto_backup()
RETURNS TABLE (tenant_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id AS tenant_id
  FROM public.tenants t
  WHERE t.last_backup_at IS NULL
     OR t.last_backup_at < now() - (COALESCE(t.auto_interval_days, 90) || ' days')::interval;
$$;

COMMENT ON FUNCTION public.tenants_needing_auto_backup() IS
  'Tenants sem backup ou com last_backup_at anterior ao intervalo auto_interval_days.';

CREATE OR REPLACE FUNCTION public.invoke_tenant_backup_auto()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid uuid;
  fn_url text;
  cron_secret text;
  req_id bigint;
BEGIN
  fn_url := current_setting('app.settings.tenant_backup_function_url', true);
  cron_secret := current_setting('app.settings.backup_cron_secret', true);

  IF fn_url IS NULL OR fn_url = '' OR cron_secret IS NULL OR cron_secret = '' THEN
    RAISE NOTICE 'tenant_backup auto: configure app.settings.tenant_backup_function_url e backup_cron_secret';
    RETURN;
  END IF;

  FOR tid IN SELECT t.tenant_id FROM public.tenants_needing_auto_backup() t
  LOOP
    SELECT net.http_post(
      url := fn_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || cron_secret,
        'X-Backup-Cron', '1'
      ),
      body := jsonb_build_object(
        'action', 'create',
        'tenant_id', tid::text,
        'source', 'auto'
      )
    ) INTO req_id;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.invoke_tenant_backup_auto() IS
  'Invoca Edge Function tenant-backup (create, source=auto) para cada tenant elegível.';

DO $cron$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'tenant-backup-auto-daily';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
  PERFORM cron.schedule(
    'tenant-backup-auto-daily',
    '0 3 * * *',
    'SELECT public.invoke_tenant_backup_auto();'
  );
END $cron$;
