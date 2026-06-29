-- Tolerância máxima por ponto calibrado (cadastro balança + verificação certificado)
ALTER TABLE public.scale_registrations
  ADD COLUMN IF NOT EXISTS point_max_tolerances jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.scale_registrations.point_max_tolerances IS
  'Tolerância máxima |E+U| por ponto: [{ point: 1..10, value: "0,05" }, ...]';

ALTER TABLE public.calibration_certificate_conformity
  ADD COLUMN IF NOT EXISTS max_tolerance_point_results jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS general_max_tolerance_result text NOT NULL DEFAULT 'nao_avaliado';

ALTER TABLE public.calibration_certificate_conformity
  DROP CONSTRAINT IF EXISTS calibration_certificate_conformity_general_max_tolerance_result_check;

ALTER TABLE public.calibration_certificate_conformity
  ADD CONSTRAINT calibration_certificate_conformity_general_max_tolerance_result_check
  CHECK (general_max_tolerance_result IN ('aprovado', 'alerta', 'nao_avaliado'));
