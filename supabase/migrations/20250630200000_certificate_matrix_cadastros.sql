-- Cadastro de balanças, VVC/Ue em pesos-padrão, metadados do laboratório e snapshot de repetibilidade

ALTER TABLE public.standard_weight_items
  ADD COLUMN IF NOT EXISTS conventional_value text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expanded_uncertainty text NOT NULL DEFAULT '';

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS lab_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lab_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lab_website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ipem_accreditation_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cgcre_cal_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pop_calibration_code text NOT NULL DEFAULT 'POP-CAL-02';

CREATE TABLE IF NOT EXISTS public.scale_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  serial_number text NOT NULL DEFAULT '',
  identification_code text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  capacity_1 text NOT NULL DEFAULT '',
  capacity_2 text NOT NULL DEFAULT '',
  capacity_3 text NOT NULL DEFAULT '',
  resolution_1 text NOT NULL DEFAULT '',
  resolution_2 text NOT NULL DEFAULT '',
  resolution_3 text NOT NULL DEFAULT '',
  verification_division_1 text NOT NULL DEFAULT '',
  verification_division_2 text NOT NULL DEFAULT '',
  verification_division_3 text NOT NULL DEFAULT '',
  instrument_class text NOT NULL DEFAULT '',
  working_point text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'g',
  platform_type text NOT NULL DEFAULT 'quadrada',
  decimal_places_p1 smallint NOT NULL DEFAULT 2,
  decimal_places_p2 smallint NOT NULL DEFAULT 2,
  decimal_places_p3 smallint NOT NULL DEFAULT 2,
  decimal_places_p4 smallint NOT NULL DEFAULT 2,
  decimal_places_p5 smallint NOT NULL DEFAULT 2,
  decimal_places_p6 smallint NOT NULL DEFAULT 2,
  decimal_places_p7 smallint NOT NULL DEFAULT 2,
  decimal_places_p8 smallint NOT NULL DEFAULT 2,
  decimal_places_p9 smallint NOT NULL DEFAULT 2,
  decimal_places_p10 smallint NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scale_registrations_tenant
  ON public.scale_registrations (tenant_id, serial_number);

DROP TRIGGER IF EXISTS trg_scale_registrations_touch ON public.scale_registrations;
CREATE TRIGGER trg_scale_registrations_touch
  BEFORE UPDATE ON public.scale_registrations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.scale_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scale_registrations_select" ON public.scale_registrations;
CREATE POLICY "scale_registrations_select" ON public.scale_registrations FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "scale_registrations_insert" ON public.scale_registrations;
CREATE POLICY "scale_registrations_insert" ON public.scale_registrations FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "scale_registrations_update" ON public.scale_registrations;
CREATE POLICY "scale_registrations_update" ON public.scale_registrations FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "scale_registrations_delete" ON public.scale_registrations;
CREATE POLICY "scale_registrations_delete" ON public.scale_registrations FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

ALTER TABLE public.calibration_certificates
  ADD COLUMN IF NOT EXISTS repeatability_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scale_registration_id uuid REFERENCES public.scale_registrations (id) ON DELETE SET NULL;
