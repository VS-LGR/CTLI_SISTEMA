-- Lote de carga (PR-7.6 §5.3.2.1) — pontos P2+ com substituição
ALTER TABLE public.calibration_certificate_points
  ADD COLUMN IF NOT EXISTS use_load_batch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS load_batch_formation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS load_batch_nominal numeric,
  ADD COLUMN IF NOT EXISTS load_batch_material_preset text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS error_multiplier numeric;

COMMENT ON COLUMN public.calibration_certificate_points.use_load_batch IS 'Com lote de carga (col AN aba P2–P10)';
COMMENT ON COLUMN public.calibration_certificate_points.load_batch_formation IS 'Formação PR-7.6 Tabela 01: l1_p1, l2_p1, …';
COMMENT ON COLUMN public.calibration_certificate_points.load_batch_nominal IS 'Valor nominal do lote (Vc parcial)';
COMMENT ON COLUMN public.calibration_certificate_points.load_batch_material_preset IS 'Preset PPM empuxo do lote';
COMMENT ON COLUMN public.calibration_certificate_points.error_multiplier IS 'Multiplicador M (E = Ib − Vc×M)';
