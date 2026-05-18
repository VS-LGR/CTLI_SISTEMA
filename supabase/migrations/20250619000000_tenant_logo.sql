-- Logo do ambiente (tenant) para PDF da coleta RE-7.2A

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_storage_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-branding',
  'tenant-branding',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Reutiliza cadastro_storage_tenant_from_path (primeiro segmento = tenant_id)

DROP POLICY IF EXISTS "tenant_branding_storage_select" ON storage.objects;
CREATE POLICY "tenant_branding_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-branding'
    AND (
      public.is_admin()
      OR public.cadastro_storage_tenant_from_path(name) = public.my_tenant_id()
    )
  );

DROP POLICY IF EXISTS "tenant_branding_storage_insert" ON storage.objects;
CREATE POLICY "tenant_branding_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-branding'
    AND (
      public.is_admin()
      OR public.cadastro_storage_tenant_from_path(name) = public.my_tenant_id()
    )
  );

DROP POLICY IF EXISTS "tenant_branding_storage_update" ON storage.objects;
CREATE POLICY "tenant_branding_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-branding'
    AND (
      public.is_admin()
      OR public.cadastro_storage_tenant_from_path(name) = public.my_tenant_id()
    )
  );

DROP POLICY IF EXISTS "tenant_branding_storage_delete" ON storage.objects;
CREATE POLICY "tenant_branding_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-branding'
    AND (
      public.is_admin()
      OR public.cadastro_storage_tenant_from_path(name) = public.my_tenant_id()
    )
  );
