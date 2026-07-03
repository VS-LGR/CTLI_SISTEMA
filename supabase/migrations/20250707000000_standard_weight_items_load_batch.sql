-- Lotes de carga no cadastro de pesos-padrão + vínculo opcional nos pontos do certificado

ALTER TABLE public.standard_weight_items
  ADD COLUMN IF NOT EXISTS is_load_batch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS load_batch_material_preset text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.standard_weight_items.is_load_batch IS 'true = lote de carga (Vc); false = peso padrão individual';
COMMENT ON COLUMN public.standard_weight_items.load_batch_material_preset IS 'Preset PR-7.8 (PPM empuxo) do lote de carga';

CREATE INDEX IF NOT EXISTS idx_standard_weight_items_load_batch
  ON public.standard_weight_items (tenant_id, is_load_batch)
  WHERE is_load_batch = true;

ALTER TABLE public.calibration_certificate_points
  ADD COLUMN IF NOT EXISTS load_batch_weight_id uuid REFERENCES public.standard_weight_items (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.calibration_certificate_points.load_batch_weight_id IS 'Lote de carga cadastrado (standard_weight_items.is_load_batch)';
