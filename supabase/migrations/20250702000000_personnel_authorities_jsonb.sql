-- Autoridades técnicas/gerenciais: listas padrão + colunas text → jsonb
-- (PostgreSQL não permite subquery em ALTER COLUMN ... USING; usa função auxiliar.)

CREATE OR REPLACE FUNCTION public.personnel_authorities_text_to_jsonb(val text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  IF val IS NULL OR btrim(val) = '' THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('label', line) ORDER BY ord),
    '[]'::jsonb
  )
  INTO result
  FROM (
    SELECT btrim(x) AS line, row_number() OVER () AS ord
    FROM unnest(string_to_array(val, E'\n')) AS x
    WHERE btrim(x) <> ''
  ) s;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

ALTER TABLE public.personnel_standard_options
  DROP CONSTRAINT IF EXISTS personnel_standard_options_category_check;

ALTER TABLE public.personnel_standard_options
  ADD CONSTRAINT personnel_standard_options_category_check CHECK (category IN (
    'education_level',
    'internal_training',
    'general_knowledge',
    'technical_knowledge',
    'skill',
    'qualification',
    'experience',
    'monitoring_method',
    'monitoring_reason',
    'training_classification',
    'suitability_status',
    'training_need',
    'technical_authority',
    'managerial_authority'
  ));

ALTER TABLE public.personnel_positions
  ALTER COLUMN technical_authorities DROP DEFAULT,
  ALTER COLUMN managerial_authorities DROP DEFAULT;

ALTER TABLE public.personnel_positions
  ALTER COLUMN technical_authorities TYPE jsonb
    USING public.personnel_authorities_text_to_jsonb(technical_authorities::text),
  ALTER COLUMN managerial_authorities TYPE jsonb
    USING public.personnel_authorities_text_to_jsonb(managerial_authorities::text);

ALTER TABLE public.personnel_positions
  ALTER COLUMN technical_authorities SET DEFAULT '[]'::jsonb,
  ALTER COLUMN technical_authorities SET NOT NULL,
  ALTER COLUMN managerial_authorities SET DEFAULT '[]'::jsonb,
  ALTER COLUMN managerial_authorities SET NOT NULL;

ALTER TABLE public.personnel_competency_adequacies
  ALTER COLUMN technical_authorities DROP DEFAULT,
  ALTER COLUMN managerial_authorities DROP DEFAULT;

ALTER TABLE public.personnel_competency_adequacies
  ALTER COLUMN technical_authorities TYPE jsonb
    USING public.personnel_authorities_text_to_jsonb(technical_authorities::text),
  ALTER COLUMN managerial_authorities TYPE jsonb
    USING public.personnel_authorities_text_to_jsonb(managerial_authorities::text);

ALTER TABLE public.personnel_competency_adequacies
  ALTER COLUMN technical_authorities SET DEFAULT '[]'::jsonb,
  ALTER COLUMN technical_authorities SET NOT NULL,
  ALTER COLUMN managerial_authorities SET DEFAULT '[]'::jsonb,
  ALTER COLUMN managerial_authorities SET NOT NULL;

DROP FUNCTION public.personnel_authorities_text_to_jsonb(text);
