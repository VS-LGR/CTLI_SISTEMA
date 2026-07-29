-- P1 Backup: audit trail imutável + retenção configurável

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS backup_retention_days integer NOT NULL DEFAULT 90
    CHECK (backup_retention_days >= 7 AND backup_retention_days <= 3650);

COMMENT ON COLUMN public.tenants.backup_retention_days IS
  'Dias de retenção dos ZIPs no bucket tenant-backups (purga automática na Edge Function).';

CREATE TABLE IF NOT EXISTS public.tenant_backup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('create', 'restore', 'download', 'purge', 'verify_fail')),
  outcome text NOT NULL DEFAULT 'success'
    CHECK (outcome IN ('success', 'failure', 'partial')),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'auto', 'cron')),
  restore_mode text
    CHECK (restore_mode IS NULL OR restore_mode IN ('merge', 'replace')),
  filename text NOT NULL DEFAULT '',
  storage_path text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  record_count integer NOT NULL DEFAULT 0,
  sha256 text NOT NULL DEFAULT '',
  manifest_version text NOT NULL DEFAULT '',
  error_message text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_email text NOT NULL DEFAULT '',
  actor_full_name text NOT NULL DEFAULT '',
  actor_role text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_backup_events_tenant_created
  ON public.tenant_backup_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_backup_events_sha256
  ON public.tenant_backup_events (tenant_id, sha256)
  WHERE sha256 <> '';

ALTER TABLE public.tenant_backup_events ENABLE ROW LEVEL SECURITY;

-- Somente admin CTLI lê; inserts via service role (Edge Function)
DROP POLICY IF EXISTS tenant_backup_events_select ON public.tenant_backup_events;
CREATE POLICY tenant_backup_events_select ON public.tenant_backup_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Bloquear update/delete por authenticated (trilha imutável)
DROP POLICY IF EXISTS tenant_backup_events_no_update ON public.tenant_backup_events;
CREATE POLICY tenant_backup_events_no_update ON public.tenant_backup_events
  FOR UPDATE TO authenticated
  USING (false);

DROP POLICY IF EXISTS tenant_backup_events_no_delete ON public.tenant_backup_events;
CREATE POLICY tenant_backup_events_no_delete ON public.tenant_backup_events
  FOR DELETE TO authenticated
  USING (false);

-- Insert autenticado não necessário (service role bypassa RLS); negar por segurança
DROP POLICY IF EXISTS tenant_backup_events_no_insert ON public.tenant_backup_events;
CREATE POLICY tenant_backup_events_no_insert ON public.tenant_backup_events
  FOR INSERT TO authenticated
  WITH CHECK (false);
