-- Balanças do laboratório (PR-6.4), data de registo do programa de manutenção
-- e histórico de substituição do certificado de conjunto.

CREATE TABLE IF NOT EXISTS public.laboratory_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  identification text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  serial_number text NOT NULL DEFAULT '',
  certificate_number text NOT NULL DEFAULT '',
  calibration_date date,
  expiry_date date,
  location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_laboratory_scales_tenant
  ON public.laboratory_scales (tenant_id, identification);

DROP TRIGGER IF EXISTS trg_laboratory_scales_touch ON public.laboratory_scales;
CREATE TRIGGER trg_laboratory_scales_touch
  BEFORE UPDATE ON public.laboratory_scales
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.laboratory_scales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laboratory_scales_select" ON public.laboratory_scales;
CREATE POLICY "laboratory_scales_select" ON public.laboratory_scales FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "laboratory_scales_insert" ON public.laboratory_scales;
CREATE POLICY "laboratory_scales_insert" ON public.laboratory_scales FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "laboratory_scales_update" ON public.laboratory_scales;
CREATE POLICY "laboratory_scales_update" ON public.laboratory_scales FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "laboratory_scales_delete" ON public.laboratory_scales;
CREATE POLICY "laboratory_scales_delete" ON public.laboratory_scales FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

ALTER TABLE public.equipment_maintenance_programs
  ADD COLUMN IF NOT EXISTS record_date date;

COMMENT ON COLUMN public.equipment_maintenance_programs.record_date IS
  'Data de registo editável do programa. O updated_at continua a ser o instante real de gravação.';

CREATE TABLE IF NOT EXISTS public.weight_set_certificate_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  weight_certificate_id uuid NOT NULL REFERENCES public.weight_standard_certificates (id) ON DELETE CASCADE,
  set_name text NOT NULL DEFAULT '',
  previous_certificate_number text NOT NULL DEFAULT '',
  new_certificate_number text NOT NULL DEFAULT '',
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  changed_by_name text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_weight_set_subst_cert
  ON public.weight_set_certificate_substitutions (weight_certificate_id, changed_at DESC);

ALTER TABLE public.weight_set_certificate_substitutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weight_set_subst_select" ON public.weight_set_certificate_substitutions;
CREATE POLICY "weight_set_subst_select" ON public.weight_set_certificate_substitutions FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "weight_set_subst_insert" ON public.weight_set_certificate_substitutions;
CREATE POLICY "weight_set_subst_insert" ON public.weight_set_certificate_substitutions FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
