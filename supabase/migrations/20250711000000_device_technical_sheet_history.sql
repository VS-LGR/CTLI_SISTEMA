-- Histórico de alterações de itens da ficha técnica (RE-6.4B)

CREATE TABLE IF NOT EXISTS public.device_technical_sheet_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('peso', 'thermo')),
  source_id uuid NOT NULL,
  identification text NOT NULL DEFAULT '',
  field_key text NOT NULL DEFAULT '',
  field_label text NOT NULL DEFAULT '',
  old_value text NOT NULL DEFAULT '',
  new_value text NOT NULL DEFAULT '',
  certificate_number_snapshot text NOT NULL DEFAULT '',
  changed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_sheet_history_tenant
  ON public.device_technical_sheet_history (tenant_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_sheet_history_source
  ON public.device_technical_sheet_history (tenant_id, source, source_id);

ALTER TABLE public.device_technical_sheet_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_sheet_history_select" ON public.device_technical_sheet_history;
CREATE POLICY "device_sheet_history_select" ON public.device_technical_sheet_history FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "device_sheet_history_insert" ON public.device_technical_sheet_history;
CREATE POLICY "device_sheet_history_insert" ON public.device_technical_sheet_history FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
