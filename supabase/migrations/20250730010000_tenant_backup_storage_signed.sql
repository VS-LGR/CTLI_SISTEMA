-- Backup P0: bucket privado com limite maior; artefacto via Edge Function + URL assinada.
-- Sem RLS authenticated no bucket (apenas service role na função).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-backups',
  'tenant-backups',
  false,
  524288000, -- 500 MiB
  ARRAY['application/zip', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
