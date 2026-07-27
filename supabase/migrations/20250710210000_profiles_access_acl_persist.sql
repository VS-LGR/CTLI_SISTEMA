-- Garante coluna ACL e grava access_acl no trigger de criação (metadados do createUser).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_acl jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.access_acl IS
  'JSON ACL: { version:1, modules:[], folders:{ "6":["pr-6-2"], "7":["pr-7-1"] } }. Sem version = legado (matriz por papel).';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_acl jsonb;
  meta_coleta boolean;
  meta_cert boolean;
BEGIN
  meta_acl := COALESCE(NEW.raw_user_meta_data->'access_acl', '{}'::jsonb);
  IF jsonb_typeof(meta_acl) <> 'object' THEN
    meta_acl := '{}'::jsonb;
  END IF;

  meta_coleta := COALESCE((NEW.raw_user_meta_data->>'access_coleta')::boolean, false);
  meta_cert := COALESCE((NEW.raw_user_meta_data->>'access_certificados')::boolean, false);

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    tenant_id,
    access_coleta,
    access_certificados,
    access_acl
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'gerente_qualidade'),
    (NULLIF(NEW.raw_user_meta_data->>'tenant_id', ''))::uuid,
    meta_coleta,
    meta_cert,
    meta_acl
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id,
    access_coleta = EXCLUDED.access_coleta,
    access_certificados = EXCLUDED.access_certificados,
    -- Só substitui ACL se o metadata trouxe version:1 (evita apagar ACL já gravada com {}).
    access_acl = CASE
      WHEN (EXCLUDED.access_acl ? 'version') THEN EXCLUDED.access_acl
      ELSE public.profiles.access_acl
    END,
    updated_at = now();
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
