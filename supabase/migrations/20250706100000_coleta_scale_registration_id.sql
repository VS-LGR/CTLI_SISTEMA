-- Vínculo opcional coleta → balança cadastrada (usado ao gerar coleta a partir da proposta)

ALTER TABLE public.scale_calibration_collections
  ADD COLUMN IF NOT EXISTS scale_registration_id uuid REFERENCES public.scale_registrations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scale_cal_coll_scale_registration
  ON public.scale_calibration_collections (scale_registration_id)
  WHERE scale_registration_id IS NOT NULL;
