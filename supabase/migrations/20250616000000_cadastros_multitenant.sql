-- Cadastros multitenant: fornecedores, clientes do cliente, colaboradores, certificados
-- RLS: administrador CTLI (is_admin) OU utilizador com tenant_id = my_tenant_id()

-- Cargos / escolaridade (alinhado a src/lib/cadastroConstants.js)
CREATE TABLE IF NOT EXISTS public.supplier_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  name text NOT NULL,
  full_address text NOT NULL DEFAULT '',
  cnpj text NOT NULL DEFAULT '',
  representative_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  registration_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.end_customer_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  name text NOT NULL,
  full_address text NOT NULL DEFAULT '',
  cnpj text NOT NULL DEFAULT '',
  representative_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  registration_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  registration_code text NOT NULL,
  full_name text NOT NULL,
  cpf text NOT NULL DEFAULT '',
  rg text NOT NULL DEFAULT '',
  rg_issuer text NOT NULL DEFAULT '',
  admission_date date NOT NULL,
  job_role text NOT NULL
    CHECK (job_role IN (
      'operador', 'tecnico', 'supervisor', 'coordenador', 'gerente', 'diretoria', 'administrativo', 'auxiliar', 'estagiario', 'outro'
    )),
  education_level text NOT NULL
    CHECK (education_level IN (
      'fundamental_incompleto', 'fundamental_completo', 'medio_incompleto', 'medio_completo',
      'superior_incompleto', 'superior_completo', 'pos_graduacao', 'mestrado_doutorado'
    )),
  supervisor_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, registration_code)
);

CREATE INDEX IF NOT EXISTS idx_employee_registrations_tenant ON public.employee_registrations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_reg_tenant ON public.supplier_registrations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_end_customer_reg_tenant ON public.end_customer_registrations (tenant_id);

CREATE OR REPLACE FUNCTION public.employee_supervisor_same_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.supervisor_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.employee_registrations s
    WHERE s.id = NEW.supervisor_id AND s.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'supervisor_id deve pertencer ao mesmo tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employee_supervisor_tenant ON public.employee_registrations;
CREATE TRIGGER trg_employee_supervisor_tenant
  BEFORE INSERT OR UPDATE OF supervisor_id, tenant_id ON public.employee_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.employee_supervisor_same_tenant();

CREATE TABLE IF NOT EXISTS public.weight_standard_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  set_name text NOT NULL DEFAULT '',
  class text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  manufacturer text NOT NULL DEFAULT '',
  model_type text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT '',
  certificate_number text NOT NULL DEFAULT '',
  calibration_date date NOT NULL,
  intermediate_check_label text NOT NULL DEFAULT '',
  expiry_date date NOT NULL,
  calibrated_by text NOT NULL DEFAULT '',
  attachment_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.environment_sensor_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  equipment_name text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  certificate_number text NOT NULL DEFAULT '',
  calibration_date date NOT NULL,
  intermediate_check_label text NOT NULL DEFAULT '',
  expiry_date date NOT NULL,
  calibrated_by text NOT NULL DEFAULT '',
  attachment_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_cert_tenant_cal ON public.weight_standard_certificates (tenant_id, calibration_date);
CREATE INDEX IF NOT EXISTS idx_env_cert_tenant_cal ON public.environment_sensor_certificates (tenant_id, calibration_date);

CREATE OR REPLACE FUNCTION public.sync_certificate_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.intermediate_check_label := to_char(NEW.calibration_date + interval '1 year', 'MM/YYYY');
  NEW.expiry_date := (NEW.calibration_date + interval '2 years')::date;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_weight_cert_dates ON public.weight_standard_certificates;
CREATE TRIGGER trg_weight_cert_dates
  BEFORE INSERT OR UPDATE OF calibration_date ON public.weight_standard_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_certificate_dates();

DROP TRIGGER IF EXISTS trg_weight_cert_touch ON public.weight_standard_certificates;
CREATE TRIGGER trg_weight_cert_touch
  BEFORE UPDATE ON public.weight_standard_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_env_cert_dates ON public.environment_sensor_certificates;
CREATE TRIGGER trg_env_cert_dates
  BEFORE INSERT OR UPDATE OF calibration_date ON public.environment_sensor_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_certificate_dates();

DROP TRIGGER IF EXISTS trg_env_cert_touch ON public.environment_sensor_certificates;
CREATE TRIGGER trg_env_cert_touch
  BEFORE UPDATE ON public.environment_sensor_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_supplier_touch ON public.supplier_registrations;
CREATE TRIGGER trg_supplier_touch
  BEFORE UPDATE ON public.supplier_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_end_customer_touch ON public.end_customer_registrations;
CREATE TRIGGER trg_end_customer_touch
  BEFORE UPDATE ON public.end_customer_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_employee_touch ON public.employee_registrations;
CREATE TRIGGER trg_employee_touch
  BEFORE UPDATE ON public.employee_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- RLS helper: linha acessível pelo tenant
CREATE OR REPLACE FUNCTION public.cadastro_tenant_access(tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tid IS NOT NULL
    AND (
      public.is_admin()
      OR tid = public.my_tenant_id()
    );
$$;

ALTER TABLE public.supplier_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.end_customer_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_standard_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_sensor_certificates ENABLE ROW LEVEL SECURITY;

-- supplier_registrations
DROP POLICY IF EXISTS "supplier_reg_select" ON public.supplier_registrations;
CREATE POLICY "supplier_reg_select" ON public.supplier_registrations FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "supplier_reg_insert" ON public.supplier_registrations;
CREATE POLICY "supplier_reg_insert" ON public.supplier_registrations FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "supplier_reg_update" ON public.supplier_registrations;
CREATE POLICY "supplier_reg_update" ON public.supplier_registrations FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "supplier_reg_delete" ON public.supplier_registrations;
CREATE POLICY "supplier_reg_delete" ON public.supplier_registrations FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

-- end_customer_registrations
DROP POLICY IF EXISTS "end_customer_reg_select" ON public.end_customer_registrations;
CREATE POLICY "end_customer_reg_select" ON public.end_customer_registrations FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "end_customer_reg_insert" ON public.end_customer_registrations;
CREATE POLICY "end_customer_reg_insert" ON public.end_customer_registrations FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "end_customer_reg_update" ON public.end_customer_registrations;
CREATE POLICY "end_customer_reg_update" ON public.end_customer_registrations FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "end_customer_reg_delete" ON public.end_customer_registrations;
CREATE POLICY "end_customer_reg_delete" ON public.end_customer_registrations FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

-- employee_registrations
DROP POLICY IF EXISTS "employee_reg_select" ON public.employee_registrations;
CREATE POLICY "employee_reg_select" ON public.employee_registrations FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "employee_reg_insert" ON public.employee_registrations;
CREATE POLICY "employee_reg_insert" ON public.employee_registrations FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "employee_reg_update" ON public.employee_registrations;
CREATE POLICY "employee_reg_update" ON public.employee_registrations FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "employee_reg_delete" ON public.employee_registrations;
CREATE POLICY "employee_reg_delete" ON public.employee_registrations FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

-- weight_standard_certificates
DROP POLICY IF EXISTS "weight_cert_select" ON public.weight_standard_certificates;
CREATE POLICY "weight_cert_select" ON public.weight_standard_certificates FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "weight_cert_insert" ON public.weight_standard_certificates;
CREATE POLICY "weight_cert_insert" ON public.weight_standard_certificates FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "weight_cert_update" ON public.weight_standard_certificates;
CREATE POLICY "weight_cert_update" ON public.weight_standard_certificates FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "weight_cert_delete" ON public.weight_standard_certificates;
CREATE POLICY "weight_cert_delete" ON public.weight_standard_certificates FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

-- environment_sensor_certificates
DROP POLICY IF EXISTS "env_cert_select" ON public.environment_sensor_certificates;
CREATE POLICY "env_cert_select" ON public.environment_sensor_certificates FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "env_cert_insert" ON public.environment_sensor_certificates;
CREATE POLICY "env_cert_insert" ON public.environment_sensor_certificates FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "env_cert_update" ON public.environment_sensor_certificates;
CREATE POLICY "env_cert_update" ON public.environment_sensor_certificates FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "env_cert_delete" ON public.environment_sensor_certificates;
CREATE POLICY "env_cert_delete" ON public.environment_sensor_certificates FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

-- Storage bucket (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cadastro-certificados',
  'cadastro-certificados',
  false,
  52428800,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.cadastro_storage_tenant_from_path(obj_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  first_part text;
BEGIN
  first_part := split_part(obj_name, '/', 1);
  IF first_part = '' OR length(first_part) < 32 THEN
    RETURN NULL;
  END IF;
  RETURN first_part::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "cadastro_cert_storage_select" ON storage.objects;
CREATE POLICY "cadastro_cert_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'cadastro-certificados'
    AND (
      public.is_admin()
      OR public.cadastro_storage_tenant_from_path(name) = public.my_tenant_id()
    )
  );

DROP POLICY IF EXISTS "cadastro_cert_storage_insert" ON storage.objects;
CREATE POLICY "cadastro_cert_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cadastro-certificados'
    AND (
      public.is_admin()
      OR public.cadastro_storage_tenant_from_path(name) = public.my_tenant_id()
    )
  );

DROP POLICY IF EXISTS "cadastro_cert_storage_update" ON storage.objects;
CREATE POLICY "cadastro_cert_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cadastro-certificados'
    AND (
      public.is_admin()
      OR public.cadastro_storage_tenant_from_path(name) = public.my_tenant_id()
    )
  );

DROP POLICY IF EXISTS "cadastro_cert_storage_delete" ON storage.objects;
CREATE POLICY "cadastro_cert_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cadastro-certificados'
    AND (
      public.is_admin()
      OR public.cadastro_storage_tenant_from_path(name) = public.my_tenant_id()
    )
  );
