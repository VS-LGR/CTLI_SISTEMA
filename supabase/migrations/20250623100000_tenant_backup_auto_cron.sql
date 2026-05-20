-- DEPRECADO: backup passou a ser só ZIP local (ver 20250624000000_tenant_backup_local_only.sql).
-- Não aplique este ficheiro em projetos novos. Se já aplicou, execute 20250624000000 para limpar.
--
-- Backup automático (pg_cron + pg_net)
--
-- SQL Editor do Supabase: execute UM bloco de cada vez (selecione só esse bloco e Run).
-- Não use "Explain" com vários statements — dá erro "EXPLAIN only works on a single SQL statement".
-- Alternativa: supabase db push (aplica todas as migrações de uma vez).
--
-- Antes: ative as extensões pg_cron e pg_net em Database → Extensions (se ainda não estiverem).

-- ========== BLOCO 1 — extensões (opcional se já ativou no Dashboard) ==========
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ========== BLOCO 2 — pg_net ==========
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ========== BLOCO 3 — função: tenants elegíveis ==========
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
     OR t.last_backup_at < now() - (COALESCE(t.auto_interval_days, 20) || ' days')::interval;
$$;

-- ========== BLOCO 4 — função: invocar Edge Function ==========
-- Configure no SQL Editor (uma vez), com o URL e o mesmo valor de BACKUP_CRON_SECRET da Edge Function:
--   ALTER DATABASE postgres SET app.settings.tenant_backup_function_url = 'https://SEU_REF.supabase.co/functions/v1/tenant-backup';
--   ALTER DATABASE postgres SET app.settings.backup_cron_secret = 'seu-segredo';
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

-- ========== BLOCO 5 — agendar job diário (03:00 UTC) ==========
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
