-- Massa específica do ar (importada da coleta RE-7.2A / verso repetitividade)

ALTER TABLE public.calibration_certificate_environmental
  ADD COLUMN IF NOT EXISTS air_density text NOT NULL DEFAULT '';
