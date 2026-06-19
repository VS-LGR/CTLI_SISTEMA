-- Leituras flexíveis e metadados por ponto (Cadastro de Pontos / planilha matriz)

ALTER TABLE public.calibration_certificate_points
  ADD COLUMN IF NOT EXISTS readings_before jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS readings_after jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buoyancy_ppm text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification_division text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS point_enabled boolean NOT NULL DEFAULT false;

-- Backfill a partir das colunas legadas
UPDATE public.calibration_certificate_points
SET readings_after = (
  SELECT COALESCE(jsonb_agg(v ORDER BY ord), '[]'::jsonb)
  FROM (
    SELECT reading1 AS v, 1 AS ord WHERE reading1 IS NOT NULL
    UNION ALL SELECT reading2, 2 WHERE reading2 IS NOT NULL
    UNION ALL SELECT reading3, 3 WHERE reading3 IS NOT NULL
  ) sub
)
WHERE readings_after = '[]'::jsonb
  AND (reading1 IS NOT NULL OR reading2 IS NOT NULL OR reading3 IS NOT NULL);

UPDATE public.calibration_certificate_points
SET readings_before = jsonb_build_array(reading_before_adjustment)
WHERE readings_before = '[]'::jsonb
  AND reading_before_adjustment IS NOT NULL;

UPDATE public.calibration_certificate_points
SET point_enabled = true
WHERE point_enabled = false
  AND (
    nominal_value IS NOT NULL
    OR reading1 IS NOT NULL
    OR reading_before_adjustment IS NOT NULL
    OR cardinality(standard_weight_ids) > 0
  );
