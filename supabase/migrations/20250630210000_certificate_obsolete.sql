-- Status obsoleto: registo de quando/quem marcou antes da exclusão permanente

ALTER TABLE public.calibration_certificates
  ADD COLUMN IF NOT EXISTS obsoleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS obsoleted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS obsolete_reason text NOT NULL DEFAULT '';
