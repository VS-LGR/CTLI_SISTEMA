-- RE-7.2B — Certificado de Calibração de Balanças

CREATE TABLE IF NOT EXISTS public.calibration_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.scale_calibration_collections (id) ON DELETE SET NULL,
  certificate_number integer,
  certificate_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  certificate_revision text NOT NULL DEFAULT '00',
  certificate_type text NOT NULL DEFAULT 'rastreavel'
    CHECK (certificate_type IN ('rbc', 'rastreavel')),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN (
      'rascunho', 'calculado', 'em_revisao_tecnica', 'aguardando_aprovacao',
      'aprovado', 'emitido', 'substituido', 'cancelado', 'reprovado'
    )),
  end_customer_id uuid REFERENCES public.end_customer_registrations (id) ON DELETE SET NULL,
  executor_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  signatory_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  scale_serial text NOT NULL DEFAULT '',
  commercial_proposal_ref text NOT NULL DEFAULT '',
  calibration_date date,
  issue_date date,
  approval_date date,
  calibration_location text NOT NULL DEFAULT '',
  is_preview_only boolean NOT NULL DEFAULT false,
  replaces_certificate_id uuid REFERENCES public.calibration_certificates (id) ON DELETE SET NULL,
  replacement_reason text NOT NULL DEFAULT '',
  cancellation_reason text NOT NULL DEFAULT '',
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  document_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  technical_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  balance_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  collection_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  eccentricity_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  control_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  executor_name text NOT NULL DEFAULT '',
  signatory_name text NOT NULL DEFAULT '',
  approval_notes text NOT NULL DEFAULT '',
  emitted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cal_cert_tenant_updated
  ON public.calibration_certificates (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cal_cert_tenant_status
  ON public.calibration_certificates (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cal_cert_collection
  ON public.calibration_certificates (collection_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cal_cert_number_active
  ON public.calibration_certificates (tenant_id, certificate_year, certificate_number)
  WHERE status NOT IN ('cancelado', 'substituido') AND certificate_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cal_cert_active_collection
  ON public.calibration_certificates (collection_id)
  WHERE status NOT IN ('cancelado', 'substituido') AND collection_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.calibration_certificate_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.calibration_certificates (id) ON DELETE CASCADE,
  point_number integer NOT NULL CHECK (point_number BETWEEN 1 AND 10),
  nominal_value numeric,
  reading_before_adjustment numeric,
  reading1 numeric,
  reading2 numeric,
  reading3 numeric,
  average_reading numeric,
  indication_error numeric,
  error_before_adjustment numeric,
  repeatability numeric,
  resolution numeric,
  standard_uncertainty numeric,
  expanded_uncertainty numeric,
  coverage_factor numeric,
  degrees_of_freedom numeric,
  tolerance_positive numeric,
  tolerance_negative numeric,
  conformity_result text NOT NULL DEFAULT 'nao_avaliado'
    CHECK (conformity_result IN ('conforme', 'nao_conforme', 'nao_avaliado', 'nao_aplicavel')),
  standard_weight_ids uuid[] NOT NULL DEFAULT '{}',
  calculation_memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  calc_status text NOT NULL DEFAULT 'pendente'
    CHECK (calc_status IN ('pendente', 'calculado', 'erro')),
  calc_error text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (certificate_id, point_number)
);

CREATE INDEX IF NOT EXISTS idx_cal_cert_points_cert
  ON public.calibration_certificate_points (certificate_id, point_number);

CREATE TABLE IF NOT EXISTS public.calibration_certificate_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.calibration_certificates (id) ON DELETE CASCADE,
  standard_type text NOT NULL
    CHECK (standard_type IN ('peso_padrao', 'termo_baro_higrometro', 'outro')),
  standard_id uuid,
  identification_code text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  certificate_number text NOT NULL DEFAULT '',
  calibration_date date,
  valid_until date,
  uncertainty numeric,
  laboratory text NOT NULL DEFAULT '',
  traceability text NOT NULL DEFAULT '',
  expired_override boolean NOT NULL DEFAULT false,
  expired_override_reason text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cal_cert_standards_cert
  ON public.calibration_certificate_standards (certificate_id);

CREATE TABLE IF NOT EXISTS public.calibration_certificate_environmental (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL UNIQUE REFERENCES public.calibration_certificates (id) ON DELETE CASCADE,
  thermo_hygrometer_id uuid,
  thermo_hygrometer_id_2 uuid,
  start_time text NOT NULL DEFAULT '',
  end_time text NOT NULL DEFAULT '',
  initial_temperature text NOT NULL DEFAULT '',
  final_temperature text NOT NULL DEFAULT '',
  initial_humidity text NOT NULL DEFAULT '',
  final_humidity text NOT NULL DEFAULT '',
  initial_pressure text NOT NULL DEFAULT '',
  final_pressure text NOT NULL DEFAULT '',
  balance_adjusted text NOT NULL DEFAULT '',
  balance_leveled text NOT NULL DEFAULT '',
  has_vibration text NOT NULL DEFAULT '',
  has_air_flow text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calibration_certificate_conformity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL UNIQUE REFERENCES public.calibration_certificates (id) ON DELETE CASCADE,
  legal_metrology_applicable boolean NOT NULL DEFAULT false,
  instrument_class text NOT NULL DEFAULT '',
  applicable_ordinance text NOT NULL DEFAULT '',
  customer_criterion text NOT NULL DEFAULT '',
  decision_rule text NOT NULL DEFAULT '',
  declaration_of_conformity text NOT NULL DEFAULT '',
  general_conformity_result text NOT NULL DEFAULT 'nao_avaliado'
    CHECK (general_conformity_result IN ('conforme', 'nao_conforme', 'nao_avaliado', 'nao_aplicavel')),
  notes text NOT NULL DEFAULT '',
  point_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calibration_certificate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.calibration_certificates (id) ON DELETE CASCADE,
  review_type text NOT NULL
    CHECK (review_type IN ('analise_critica', 'aprovacao', 'reprovacao', 'substituicao', 'cancelamento')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cal_cert_reviews_cert
  ON public.calibration_certificate_reviews (certificate_id, created_at DESC);

-- Coleta: workflow e vínculo com certificado
ALTER TABLE public.scale_calibration_collections
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS certificate_id uuid REFERENCES public.calibration_certificates (id) ON DELETE SET NULL;

ALTER TABLE public.scale_calibration_collections
  DROP CONSTRAINT IF EXISTS scale_calibration_collections_workflow_status_check;

ALTER TABLE public.scale_calibration_collections
  ADD CONSTRAINT scale_calibration_collections_workflow_status_check
  CHECK (workflow_status IN (
    'rascunho', 'preenchida', 'conferida', 'aprovada_certificado',
    'certificado_gerado', 'cancelada'
  ));

CREATE OR REPLACE FUNCTION public.next_calibration_certificate_number(p_tenant_id uuid, p_year integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(certificate_number), 0) + 1
  FROM public.calibration_certificates
  WHERE tenant_id = p_tenant_id AND certificate_year = p_year;
$$;

CREATE OR REPLACE FUNCTION public.calibration_certificate_tenant_from_child(p_cert_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.calibration_certificates WHERE id = p_cert_id LIMIT 1;
$$;

DROP TRIGGER IF EXISTS trg_cal_cert_touch ON public.calibration_certificates;
CREATE TRIGGER trg_cal_cert_touch
  BEFORE UPDATE ON public.calibration_certificates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_cal_cert_points_touch ON public.calibration_certificate_points;
CREATE TRIGGER trg_cal_cert_points_touch
  BEFORE UPDATE ON public.calibration_certificate_points
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_cal_cert_standards_touch ON public.calibration_certificate_standards;
CREATE TRIGGER trg_cal_cert_standards_touch
  BEFORE UPDATE ON public.calibration_certificate_standards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_cal_cert_env_touch ON public.calibration_certificate_environmental;
CREATE TRIGGER trg_cal_cert_env_touch
  BEFORE UPDATE ON public.calibration_certificate_environmental
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_cal_cert_conf_touch ON public.calibration_certificate_conformity;
CREATE TRIGGER trg_cal_cert_conf_touch
  BEFORE UPDATE ON public.calibration_certificate_conformity
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.calibration_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_certificate_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_certificate_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_certificate_environmental ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_certificate_conformity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_certificate_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cal_cert_select" ON public.calibration_certificates;
CREATE POLICY "cal_cert_select" ON public.calibration_certificates FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "cal_cert_insert" ON public.calibration_certificates;
CREATE POLICY "cal_cert_insert" ON public.calibration_certificates FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "cal_cert_update" ON public.calibration_certificates;
CREATE POLICY "cal_cert_update" ON public.calibration_certificates FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "cal_cert_delete" ON public.calibration_certificates;
CREATE POLICY "cal_cert_delete" ON public.calibration_certificates FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "cal_cert_points_select" ON public.calibration_certificate_points;
CREATE POLICY "cal_cert_points_select" ON public.calibration_certificate_points FOR SELECT
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_points_insert" ON public.calibration_certificate_points;
CREATE POLICY "cal_cert_points_insert" ON public.calibration_certificate_points FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_points_update" ON public.calibration_certificate_points;
CREATE POLICY "cal_cert_points_update" ON public.calibration_certificate_points FOR UPDATE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)))
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_points_delete" ON public.calibration_certificate_points;
CREATE POLICY "cal_cert_points_delete" ON public.calibration_certificate_points FOR DELETE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));

DROP POLICY IF EXISTS "cal_cert_standards_select" ON public.calibration_certificate_standards;
CREATE POLICY "cal_cert_standards_select" ON public.calibration_certificate_standards FOR SELECT
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_standards_insert" ON public.calibration_certificate_standards;
CREATE POLICY "cal_cert_standards_insert" ON public.calibration_certificate_standards FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_standards_update" ON public.calibration_certificate_standards;
CREATE POLICY "cal_cert_standards_update" ON public.calibration_certificate_standards FOR UPDATE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)))
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_standards_delete" ON public.calibration_certificate_standards;
CREATE POLICY "cal_cert_standards_delete" ON public.calibration_certificate_standards FOR DELETE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));

DROP POLICY IF EXISTS "cal_cert_env_select" ON public.calibration_certificate_environmental;
CREATE POLICY "cal_cert_env_select" ON public.calibration_certificate_environmental FOR SELECT
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_env_insert" ON public.calibration_certificate_environmental;
CREATE POLICY "cal_cert_env_insert" ON public.calibration_certificate_environmental FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_env_update" ON public.calibration_certificate_environmental;
CREATE POLICY "cal_cert_env_update" ON public.calibration_certificate_environmental FOR UPDATE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)))
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_env_delete" ON public.calibration_certificate_environmental;
CREATE POLICY "cal_cert_env_delete" ON public.calibration_certificate_environmental FOR DELETE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));

DROP POLICY IF EXISTS "cal_cert_conf_select" ON public.calibration_certificate_conformity;
CREATE POLICY "cal_cert_conf_select" ON public.calibration_certificate_conformity FOR SELECT
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_conf_insert" ON public.calibration_certificate_conformity;
CREATE POLICY "cal_cert_conf_insert" ON public.calibration_certificate_conformity FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_conf_update" ON public.calibration_certificate_conformity;
CREATE POLICY "cal_cert_conf_update" ON public.calibration_certificate_conformity FOR UPDATE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)))
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_conf_delete" ON public.calibration_certificate_conformity;
CREATE POLICY "cal_cert_conf_delete" ON public.calibration_certificate_conformity FOR DELETE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));

DROP POLICY IF EXISTS "cal_cert_reviews_select" ON public.calibration_certificate_reviews;
CREATE POLICY "cal_cert_reviews_select" ON public.calibration_certificate_reviews FOR SELECT
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_reviews_insert" ON public.calibration_certificate_reviews;
CREATE POLICY "cal_cert_reviews_insert" ON public.calibration_certificate_reviews FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_reviews_update" ON public.calibration_certificate_reviews;
CREATE POLICY "cal_cert_reviews_update" ON public.calibration_certificate_reviews FOR UPDATE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)))
  WITH CHECK (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "cal_cert_reviews_delete" ON public.calibration_certificate_reviews;
CREATE POLICY "cal_cert_reviews_delete" ON public.calibration_certificate_reviews FOR DELETE
  USING (public.cadastro_tenant_access(public.calibration_certificate_tenant_from_child(certificate_id)));

-- Lista Mestra: template RE-7.2B
UPDATE public.master_documents
SET template_key = 're-72b-certificado-calibracao-pdf'
WHERE code = 'RE-7.2B' AND (template_key IS NULL OR template_key = '');

INSERT INTO public.document_template_links (tenant_id, master_document_id, template_key, module_name, is_default, is_active)
SELECT md.tenant_id, md.id, 're-72b-certificado-calibracao-pdf', 'PR-7.2', true, true
FROM public.master_documents md
WHERE md.code = 'RE-7.2B'
  AND NOT EXISTS (
    SELECT 1 FROM public.document_template_links dtl
    WHERE dtl.master_document_id = md.id AND dtl.template_key = 're-72b-certificado-calibracao-pdf'
  );
