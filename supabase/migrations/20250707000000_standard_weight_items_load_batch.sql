-- Lotes de carga no cadastro de pesos-padrão + vínculo opcional nos pontos do certificado

ALTER TABLE public.standard_weight_items
  ADD COLUMN IF NOT EXISTS is_load_batch boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.standard_weight_items.is_load_batch IS 'true = lote de carga; false = peso padrão individual';

CREATE INDEX IF NOT EXISTS idx_standard_weight_items_load_batch
  ON public.standard_weight_items (tenant_id, is_load_batch)
  WHERE is_load_batch = true;

ALTER TABLE public.calibration_certificate_points
  ADD COLUMN IF NOT EXISTS load_batch_weight_id uuid REFERENCES public.standard_weight_items (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS load_batch_conventional_value numeric,
  ADD COLUMN IF NOT EXISTS load_batch_expanded_uncertainty numeric;

COMMENT ON COLUMN public.calibration_certificate_points.load_batch_weight_id IS 'Lote de carga cadastrado (standard_weight_items.is_load_batch)';
COMMENT ON COLUMN public.calibration_certificate_points.load_batch_conventional_value IS 'V.V.C do lote de carga no ponto';
COMMENT ON COLUMN public.calibration_certificate_points.load_batch_expanded_uncertainty IS 'Ue do lote de carga no ponto';
