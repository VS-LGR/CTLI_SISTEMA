-- Atividade do laboratório: balanças, pesos ou ambos.
-- Usada para desativar o atalho de emissão que não se aplica.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS calibration_scope text NOT NULL DEFAULT 'both';

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_calibration_scope_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_calibration_scope_check
  CHECK (calibration_scope IN ('scales', 'weights', 'both'));
