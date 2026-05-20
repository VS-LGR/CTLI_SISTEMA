-- Backup por tenant: metadados, bucket privado, RLS

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS last_backup_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_interval_days integer NOT NULL DEFAULT 20;

CREATE TABLE IF NOT EXISTS public.tenant_backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  doc_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'auto')),
  manifest_version text NOT NULL DEFAULT '1',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_backup_runs_tenant_created
  ON public.tenant_backup_runs (tenant_id, created_at DESC);

ALTER TABLE public.tenant_backup_runs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.backup_tenant_access(tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tid IS NOT NULL
    AND (
      public.is_admin()
      OR (
        tid = public.my_tenant_id()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'client'
        )
      )
    );
$$;

DROP POLICY IF EXISTS "tenant_backup_runs_select" ON public.tenant_backup_runs;
CREATE POLICY "tenant_backup_runs_select" ON public.tenant_backup_runs
  FOR SELECT TO authenticated
  USING (public.backup_tenant_access(tenant_id));

DROP POLICY IF EXISTS "tenant_backup_runs_insert" ON public.tenant_backup_runs;
CREATE POLICY "tenant_backup_runs_insert" ON public.tenant_backup_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.backup_tenant_access(tenant_id));

DROP POLICY IF EXISTS "tenant_backup_runs_delete" ON public.tenant_backup_runs;
CREATE POLICY "tenant_backup_runs_delete" ON public.tenant_backup_runs
  FOR DELETE TO authenticated
  USING (public.backup_tenant_access(tenant_id));

-- Bucket privado: acesso via Edge Function (service role) + signed URLs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-backups',
  'tenant-backups',
  false,
  104857600,
  ARRAY['application/zip', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Sem políticas RLS para authenticated no bucket tenant-backups (apenas service role na função)
