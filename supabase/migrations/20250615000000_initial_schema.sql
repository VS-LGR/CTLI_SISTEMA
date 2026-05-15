-- ProcVault — schema inicial (clientes, perfis, responsáveis)
-- Roles alinhados a src/lib/roles.js + 'client' para acesso por tenant

-- Extensão para gen_random_uuid (geralmente já habilitada no Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'gerente_qualidade'
    CHECK (role IN (
      'admin',
      'diretor',
      'gerente_qualidade',
      'gerente_tecnico',
      'administrativo_vendas',
      'client'
    )),
  tenant_id uuid REFERENCES public.tenants (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

CREATE TABLE IF NOT EXISTS public.responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL
    CHECK (role IN (
      'diretor',
      'gerente_qualidade',
      'gerente_tecnico',
      'administrativo_vendas'
    )),
  email text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responsibles_tenant_id ON public.responsibles (tenant_id);

-- Perfil criado ao registar utilizador (metadados vindos da Edge Function / signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'gerente_qualidade'),
    (NULLIF(NEW.raw_user_meta_data->>'tenant_id', ''))::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- sync email updates from auth.users
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email, updated_at = now() WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_update();

-- Helpers RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsibles ENABLE ROW LEVEL SECURITY;

-- tenants
DROP POLICY IF EXISTS "tenants_select_policy" ON public.tenants;
CREATE POLICY "tenants_select_policy"
  ON public.tenants FOR SELECT
  USING (
    public.is_admin()
    OR id = public.my_tenant_id()
  );

DROP POLICY IF EXISTS "tenants_insert_policy" ON public.tenants;
CREATE POLICY "tenants_insert_policy"
  ON public.tenants FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tenants_update_policy" ON public.tenants;
CREATE POLICY "tenants_update_policy"
  ON public.tenants FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tenants_delete_policy" ON public.tenants;
CREATE POLICY "tenants_delete_policy"
  ON public.tenants FOR DELETE
  USING (public.is_admin());

-- profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR (
      tenant_id IS NOT NULL
      AND tenant_id = public.my_tenant_id()
    )
  );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- responsibles
DROP POLICY IF EXISTS "responsibles_select_policy" ON public.responsibles;
CREATE POLICY "responsibles_select_policy"
  ON public.responsibles FOR SELECT
  USING (
    public.is_admin()
    OR tenant_id = public.my_tenant_id()
  );

DROP POLICY IF EXISTS "responsibles_insert_policy" ON public.responsibles;
CREATE POLICY "responsibles_insert_policy"
  ON public.responsibles FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "responsibles_update_policy" ON public.responsibles;
CREATE POLICY "responsibles_update_policy"
  ON public.responsibles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "responsibles_delete_policy" ON public.responsibles;
CREATE POLICY "responsibles_delete_policy"
  ON public.responsibles FOR DELETE
  USING (public.is_admin());
