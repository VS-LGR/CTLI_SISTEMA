-- Documentos por tenant (procedimentos, registros, documentos legais, assinaturas)

CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  requirement text NOT NULL CHECK (requirement IN ('4', '5', '6', '7', '8')),
  folder_key text,
  section text NOT NULL CHECK (section IN ('procedimento', 'registro', 'documento', 'assinatura')),
  title text NOT NULL DEFAULT '',
  code text NOT NULL DEFAULT '',
  version text NOT NULL DEFAULT '1.0',
  responsible text NOT NULL DEFAULT '',
  review_date date,
  content_html text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'obsoleto')),
  storage_path text,
  file_name text,
  file_mime text,
  has_file boolean NOT NULL DEFAULT false,
  pinned_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant ON public.tenant_documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_list ON public.tenant_documents (
  tenant_id, requirement, folder_key, section, status
);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_title ON public.tenant_documents (tenant_id, title);

DROP TRIGGER IF EXISTS trg_tenant_documents_touch ON public.tenant_documents;
CREATE TRIGGER trg_tenant_documents_touch
  BEFORE UPDATE ON public.tenant_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_documents_select" ON public.tenant_documents;
CREATE POLICY "tenant_documents_select" ON public.tenant_documents FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "tenant_documents_insert" ON public.tenant_documents;
CREATE POLICY "tenant_documents_insert" ON public.tenant_documents FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "tenant_documents_update" ON public.tenant_documents;
CREATE POLICY "tenant_documents_update" ON public.tenant_documents FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "tenant_documents_delete" ON public.tenant_documents;
CREATE POLICY "tenant_documents_delete" ON public.tenant_documents FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

-- Storage bucket (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-documents',
  'tenant-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/png',
    'image/webp',
    'image/jpeg',
    'text/plain',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.tenant_documents_storage_tenant_from_path(obj_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  part text;
BEGIN
  part := split_part(obj_name, '/', 1);
  IF part ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN part::uuid;
  END IF;
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "tenant_documents_storage_select" ON storage.objects;
CREATE POLICY "tenant_documents_storage_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tenant-documents'
    AND public.cadastro_tenant_access(public.tenant_documents_storage_tenant_from_path(name))
  );

DROP POLICY IF EXISTS "tenant_documents_storage_insert" ON storage.objects;
CREATE POLICY "tenant_documents_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-documents'
    AND public.cadastro_tenant_access(public.tenant_documents_storage_tenant_from_path(name))
  );

DROP POLICY IF EXISTS "tenant_documents_storage_update" ON storage.objects;
CREATE POLICY "tenant_documents_storage_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tenant-documents'
    AND public.cadastro_tenant_access(public.tenant_documents_storage_tenant_from_path(name))
  );

DROP POLICY IF EXISTS "tenant_documents_storage_delete" ON storage.objects;
CREATE POLICY "tenant_documents_storage_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tenant-documents'
    AND public.cadastro_tenant_access(public.tenant_documents_storage_tenant_from_path(name))
  );
