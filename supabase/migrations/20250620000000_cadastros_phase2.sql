-- Cadastros fase 2: tipo equipamento ambiental, pesos individuais, metadados coleta por tenant

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS coleta_form_code text NOT NULL DEFAULT 'RE-7.2A',
  ADD COLUMN IF NOT EXISTS coleta_form_title text NOT NULL DEFAULT 'Coleta de Dados',
  ADD COLUMN IF NOT EXISTS coleta_form_revision text NOT NULL DEFAULT 'Rev. 03 de 14.05.26';

ALTER TABLE public.environment_sensor_certificates
  ADD COLUMN IF NOT EXISTS equipment_type text NOT NULL DEFAULT 'thermo_baro_higrometro';

ALTER TABLE public.environment_sensor_certificates
  DROP CONSTRAINT IF EXISTS environment_sensor_certificates_equipment_type_check;

ALTER TABLE public.environment_sensor_certificates
  ADD CONSTRAINT environment_sensor_certificates_equipment_type_check
  CHECK (equipment_type IN ('termo_higrometro', 'barometro', 'thermo_baro_higrometro'));

CREATE TABLE IF NOT EXISTS public.standard_weight_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  identification text NOT NULL DEFAULT '',
  nominal_value text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'g',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_standard_weight_items_tenant
  ON public.standard_weight_items (tenant_id, identification);

DROP TRIGGER IF EXISTS trg_standard_weight_items_touch ON public.standard_weight_items;
CREATE TRIGGER trg_standard_weight_items_touch
  BEFORE UPDATE ON public.standard_weight_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.standard_weight_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "standard_weight_items_select" ON public.standard_weight_items;
CREATE POLICY "standard_weight_items_select" ON public.standard_weight_items FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "standard_weight_items_insert" ON public.standard_weight_items;
CREATE POLICY "standard_weight_items_insert" ON public.standard_weight_items FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "standard_weight_items_update" ON public.standard_weight_items;
CREATE POLICY "standard_weight_items_update" ON public.standard_weight_items FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "standard_weight_items_delete" ON public.standard_weight_items;
CREATE POLICY "standard_weight_items_delete" ON public.standard_weight_items FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));
