-- Densidade do material por ponto (coluna AR aba P1 — PR-7.2 / PR-7.8)

ALTER TABLE public.calibration_certificate_points
  ADD COLUMN IF NOT EXISTS material_density text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS material_preset text NOT NULL DEFAULT '';
