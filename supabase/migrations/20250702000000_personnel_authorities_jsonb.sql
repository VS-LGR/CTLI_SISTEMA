-- Autoridades técnicas/gerenciais: listas padrão + colunas text → jsonb

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
  ALTER COLUMN technical_authorities TYPE jsonb USING (
    CASE
      WHEN technical_authorities IS NULL OR btrim(technical_authorities::text) = '' THEN '[]'::jsonb
      ELSE COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('label', btrim(line)))
          FROM unnest(string_to_array(technical_authorities::text, E'\n')) AS line
          WHERE btrim(line) <> ''
        ),
        '[]'::jsonb
      )
    END
  ),
  ALTER COLUMN managerial_authorities TYPE jsonb USING (
    CASE
      WHEN managerial_authorities IS NULL OR btrim(managerial_authorities::text) = '' THEN '[]'::jsonb
      ELSE COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('label', btrim(line)))
          FROM unnest(string_to_array(managerial_authorities::text, E'\n')) AS line
          WHERE btrim(line) <> ''
        ),
        '[]'::jsonb
      )
    END
  );

ALTER TABLE public.personnel_positions
  ALTER COLUMN technical_authorities SET DEFAULT '[]'::jsonb,
  ALTER COLUMN technical_authorities SET NOT NULL,
  ALTER COLUMN managerial_authorities SET DEFAULT '[]'::jsonb,
  ALTER COLUMN managerial_authorities SET NOT NULL;

ALTER TABLE public.personnel_competency_adequacies
  ALTER COLUMN technical_authorities DROP DEFAULT,
  ALTER COLUMN managerial_authorities DROP DEFAULT;

ALTER TABLE public.personnel_competency_adequacies
  ALTER COLUMN technical_authorities TYPE jsonb USING (
    CASE
      WHEN technical_authorities IS NULL OR btrim(technical_authorities::text) = '' THEN '[]'::jsonb
      ELSE COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('label', btrim(line)))
          FROM unnest(string_to_array(technical_authorities::text, E'\n')) AS line
          WHERE btrim(line) <> ''
        ),
        '[]'::jsonb
      )
    END
  ),
  ALTER COLUMN managerial_authorities TYPE jsonb USING (
    CASE
      WHEN managerial_authorities IS NULL OR btrim(managerial_authorities::text) = '' THEN '[]'::jsonb
      ELSE COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('label', btrim(line)))
          FROM unnest(string_to_array(managerial_authorities::text, E'\n')) AS line
          WHERE btrim(line) <> ''
        ),
        '[]'::jsonb
      )
    END
  );

ALTER TABLE public.personnel_competency_adequacies
  ALTER COLUMN technical_authorities SET DEFAULT '[]'::jsonb,
  ALTER COLUMN technical_authorities SET NOT NULL,
  ALTER COLUMN managerial_authorities SET DEFAULT '[]'::jsonb,
  ALTER COLUMN managerial_authorities SET NOT NULL;
