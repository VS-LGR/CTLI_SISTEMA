-- RE-5.4.2A/B — Coleta e Certificado de Calibração de Pesos-Padrão (sob PR-7.2)

-- Coleta RE-5.4.2A
CREATE TABLE IF NOT EXISTS public.weight_calibration_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  commercial_proposal_ref text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_name text NOT NULL DEFAULT '',
  responsible_name text NOT NULL DEFAULT '',
  weight_tag text NOT NULL DEFAULT '',
  calibration_date date,
  workflow_status text NOT NULL DEFAULT 'rascunho'
    CHECK (workflow_status IN (
      'rascunho', 'preenchida', 'conferida', 'aprovada_certificado',
      'certificado_gerado', 'cancelada'
    )),
  certificate_id uuid,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_cal_coll_tenant_updated
  ON public.weight_calibration_collections (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_weight_cal_coll_tenant_cal_date
  ON public.weight_calibration_collections (tenant_id, calibration_date DESC NULLS LAST);

DROP TRIGGER IF EXISTS trg_weight_cal_coll_touch ON public.weight_calibration_collections;
CREATE TRIGGER trg_weight_cal_coll_touch
  BEFORE UPDATE ON public.weight_calibration_collections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.weight_calibration_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weight_cal_coll_select" ON public.weight_calibration_collections;
CREATE POLICY "weight_cal_coll_select" ON public.weight_calibration_collections FOR SELECT
  USING (public.coleta_access(tenant_id));
DROP POLICY IF EXISTS "weight_cal_coll_insert" ON public.weight_calibration_collections;
CREATE POLICY "weight_cal_coll_insert" ON public.weight_calibration_collections FOR INSERT
  WITH CHECK (public.coleta_access(tenant_id));
DROP POLICY IF EXISTS "weight_cal_coll_update" ON public.weight_calibration_collections;
CREATE POLICY "weight_cal_coll_update" ON public.weight_calibration_collections FOR UPDATE
  USING (public.coleta_access(tenant_id))
  WITH CHECK (public.coleta_access(tenant_id));
DROP POLICY IF EXISTS "weight_cal_coll_delete" ON public.weight_calibration_collections;
CREATE POLICY "weight_cal_coll_delete" ON public.weight_calibration_collections FOR DELETE
  USING (public.coleta_access(tenant_id));

-- Certificado RE-5.4.2B
CREATE TABLE IF NOT EXISTS public.weight_calibration_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.weight_calibration_collections (id) ON DELETE SET NULL,
  certificate_number integer,
  certificate_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  certificate_revision text NOT NULL DEFAULT '00',
  certificate_type text NOT NULL DEFAULT 'rastreavel'
    CHECK (certificate_type IN ('rbc', 'rastreavel')),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN (
      'rascunho', 'calculado', 'em_revisao_tecnica', 'aguardando_aprovacao',
      'aprovado', 'emitido', 'enviado', 'substituido', 'cancelado', 'reprovado', 'obsoleto'
    )),
  end_customer_id uuid REFERENCES public.end_customer_registrations (id) ON DELETE SET NULL,
  executor_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  signatory_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  contractor_name text NOT NULL DEFAULT '',
  weight_tag text NOT NULL DEFAULT '',
  weight_serial text NOT NULL DEFAULT '',
  weight_class text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  process_number text NOT NULL DEFAULT '',
  commercial_proposal_ref text NOT NULL DEFAULT '',
  calibration_date date,
  issue_date date,
  approval_date date,
  validity_date date,
  calibration_location text NOT NULL DEFAULT '',
  is_preview_only boolean NOT NULL DEFAULT false,
  was_adjusted text NOT NULL DEFAULT 'nao',
  display_rows integer NOT NULL DEFAULT 2,
  observation_1 text NOT NULL DEFAULT '',
  observation_2 text NOT NULL DEFAULT '',
  observation_3 text NOT NULL DEFAULT '',
  instrument_descriptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  replaces_certificate_id uuid REFERENCES public.weight_calibration_certificates (id) ON DELETE SET NULL,
  replacement_reason text NOT NULL DEFAULT '',
  cancellation_reason text NOT NULL DEFAULT '',
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  document_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  technical_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  collection_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  control_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  executor_name text NOT NULL DEFAULT '',
  signatory_name text NOT NULL DEFAULT '',
  approval_notes text NOT NULL DEFAULT '',
  emitted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  client_email_sent_at timestamptz,
  client_email_sent_to text NOT NULL DEFAULT '',
  client_email_sent_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_cert_tenant_updated
  ON public.weight_calibration_certificates (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_weight_cert_tenant_status
  ON public.weight_calibration_certificates (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_weight_cert_collection
  ON public.weight_calibration_certificates (collection_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_cert_number_active
  ON public.weight_calibration_certificates (tenant_id, certificate_year, certificate_number)
  WHERE status NOT IN ('cancelado', 'substituido', 'obsoleto') AND certificate_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_cert_active_collection
  ON public.weight_calibration_certificates (collection_id)
  WHERE status NOT IN ('cancelado', 'substituido', 'obsoleto') AND collection_id IS NOT NULL;

ALTER TABLE public.weight_calibration_collections
  DROP CONSTRAINT IF EXISTS weight_calibration_collections_certificate_id_fkey;
ALTER TABLE public.weight_calibration_collections
  ADD CONSTRAINT weight_calibration_collections_certificate_id_fkey
  FOREIGN KEY (certificate_id) REFERENCES public.weight_calibration_certificates (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.weight_calibration_certificate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.weight_calibration_certificates (id) ON DELETE CASCADE,
  item_number integer NOT NULL CHECK (item_number BETWEEN 1 AND 24),
  identification text NOT NULL DEFAULT '',
  nominal_value numeric,
  nominal_unit text NOT NULL DEFAULT 'g',
  reference_standard_id uuid,
  reference_identification text NOT NULL DEFAULT '',
  reference_conventional_value numeric,
  reference_uncertainty numeric,
  reference_material text NOT NULL DEFAULT '',
  uut_material text NOT NULL DEFAULT '',
  uut_class text NOT NULL DEFAULT '',
  balance_resolution numeric,
  decimal_places integer NOT NULL DEFAULT 2,
  cycle_count integer NOT NULL DEFAULT 3,
  was_adjusted boolean NOT NULL DEFAULT false,
  value_before_adjustment numeric,
  value_after_adjustment numeric,
  conventional_value numeric,
  deviation numeric,
  expanded_uncertainty numeric,
  coverage_factor numeric,
  degrees_of_freedom numeric,
  class_uncertainty numeric,
  assume_class_uncertainty boolean NOT NULL DEFAULT true,
  specific_density numeric,
  approved boolean,
  conformity_result text NOT NULL DEFAULT 'nao_avaliado'
    CHECK (conformity_result IN ('conforme', 'nao_conforme', 'nao_avaliado', 'nao_aplicavel')),
  cycle_readings jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculation_memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  calc_status text NOT NULL DEFAULT 'pendente'
    CHECK (calc_status IN ('pendente', 'calculado', 'erro')),
  calc_error text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (certificate_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_weight_cert_items_cert
  ON public.weight_calibration_certificate_items (certificate_id, item_number);

CREATE TABLE IF NOT EXISTS public.weight_calibration_certificate_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.weight_calibration_certificates (id) ON DELETE CASCADE,
  standard_type text NOT NULL
    CHECK (standard_type IN ('balanca_laboratorio', 'peso_padrao', 'termo_baro_higrometro', 'outro')),
  standard_id uuid,
  identification_code text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  certificate_number text NOT NULL DEFAULT '',
  calibration_date date,
  valid_until date,
  laboratory text NOT NULL DEFAULT '',
  traceability text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_cert_standards_cert
  ON public.weight_calibration_certificate_standards (certificate_id);

CREATE TABLE IF NOT EXISTS public.weight_calibration_certificate_environmental (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL UNIQUE REFERENCES public.weight_calibration_certificates (id) ON DELETE CASCADE,
  initial_temperature text NOT NULL DEFAULT '',
  final_temperature text NOT NULL DEFAULT '',
  initial_humidity text NOT NULL DEFAULT '',
  final_humidity text NOT NULL DEFAULT '',
  initial_pressure text NOT NULL DEFAULT '',
  final_pressure text NOT NULL DEFAULT '',
  mean_temperature numeric,
  mean_humidity numeric,
  mean_pressure numeric,
  air_density numeric,
  notes text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weight_calibration_certificate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.weight_calibration_certificates (id) ON DELETE CASCADE,
  review_type text NOT NULL
    CHECK (review_type IN ('analise_critica', 'aprovacao', 'reprovacao', 'substituicao', 'cancelamento')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_cert_reviews_cert
  ON public.weight_calibration_certificate_reviews (certificate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.weight_certificate_email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.weight_calibration_certificates (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  recipient text NOT NULL DEFAULT '',
  resend_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message text NOT NULL DEFAULT '',
  sent_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_cert_email_deliveries_cert
  ON public.weight_certificate_email_deliveries (certificate_id, sent_at DESC);

CREATE OR REPLACE FUNCTION public.next_weight_calibration_certificate_number(p_tenant_id uuid, p_year integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(certificate_number), 0) + 1
  FROM public.weight_calibration_certificates
  WHERE tenant_id = p_tenant_id AND certificate_year = p_year;
$$;

CREATE OR REPLACE FUNCTION public.weight_calibration_certificate_tenant_from_child(p_cert_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.weight_calibration_certificates WHERE id = p_cert_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.approve_weight_calibration_certificates(
  p_certificate_ids uuid[],
  p_user_id uuid,
  p_notes text DEFAULT ''
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_cert record;
BEGIN
  FOR v_cert IN
    SELECT c.id, c.tenant_id
    FROM public.weight_calibration_certificates c
    WHERE c.id = ANY (p_certificate_ids)
      AND c.status = 'aguardando_aprovacao'
      AND public.cadastro_tenant_access(c.tenant_id)
  LOOP
    UPDATE public.weight_calibration_certificates
    SET
      status = 'aprovado',
      approval_date = COALESCE(approval_date, CURRENT_DATE),
      approval_notes = COALESCE(NULLIF(p_notes, ''), approval_notes),
      updated_by = p_user_id
    WHERE id = v_cert.id;
    INSERT INTO public.weight_calibration_certificate_reviews (certificate_id, review_type, notes, reviewed_by)
    VALUES (v_cert.id, 'aprovacao', COALESCE(p_notes, ''), p_user_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

DROP TRIGGER IF EXISTS trg_weight_cert_touch ON public.weight_calibration_certificates;
CREATE TRIGGER trg_weight_cert_touch
  BEFORE UPDATE ON public.weight_calibration_certificates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_weight_cert_items_touch ON public.weight_calibration_certificate_items;
CREATE TRIGGER trg_weight_cert_items_touch
  BEFORE UPDATE ON public.weight_calibration_certificate_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_weight_cert_standards_touch ON public.weight_calibration_certificate_standards;
CREATE TRIGGER trg_weight_cert_standards_touch
  BEFORE UPDATE ON public.weight_calibration_certificate_standards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_weight_cert_env_touch ON public.weight_calibration_certificate_environmental;
CREATE TRIGGER trg_weight_cert_env_touch
  BEFORE UPDATE ON public.weight_calibration_certificate_environmental
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.weight_calibration_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_calibration_certificate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_calibration_certificate_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_calibration_certificate_environmental ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_calibration_certificate_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_certificate_email_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weight_cert_select" ON public.weight_calibration_certificates;
CREATE POLICY "weight_cert_select" ON public.weight_calibration_certificates FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "weight_cert_insert" ON public.weight_calibration_certificates;
CREATE POLICY "weight_cert_insert" ON public.weight_calibration_certificates FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "weight_cert_update" ON public.weight_calibration_certificates;
CREATE POLICY "weight_cert_update" ON public.weight_calibration_certificates FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "weight_cert_delete" ON public.weight_calibration_certificates;
CREATE POLICY "weight_cert_delete" ON public.weight_calibration_certificates FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "weight_cert_items_select" ON public.weight_calibration_certificate_items;
CREATE POLICY "weight_cert_items_select" ON public.weight_calibration_certificate_items FOR SELECT
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_items_insert" ON public.weight_calibration_certificate_items;
CREATE POLICY "weight_cert_items_insert" ON public.weight_calibration_certificate_items FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_items_update" ON public.weight_calibration_certificate_items;
CREATE POLICY "weight_cert_items_update" ON public.weight_calibration_certificate_items FOR UPDATE
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)))
  WITH CHECK (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_items_delete" ON public.weight_calibration_certificate_items;
CREATE POLICY "weight_cert_items_delete" ON public.weight_calibration_certificate_items FOR DELETE
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));

DROP POLICY IF EXISTS "weight_cert_standards_select" ON public.weight_calibration_certificate_standards;
CREATE POLICY "weight_cert_standards_select" ON public.weight_calibration_certificate_standards FOR SELECT
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_standards_insert" ON public.weight_calibration_certificate_standards;
CREATE POLICY "weight_cert_standards_insert" ON public.weight_calibration_certificate_standards FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_standards_update" ON public.weight_calibration_certificate_standards;
CREATE POLICY "weight_cert_standards_update" ON public.weight_calibration_certificate_standards FOR UPDATE
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)))
  WITH CHECK (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_standards_delete" ON public.weight_calibration_certificate_standards;
CREATE POLICY "weight_cert_standards_delete" ON public.weight_calibration_certificate_standards FOR DELETE
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));

DROP POLICY IF EXISTS "weight_cert_env_select" ON public.weight_calibration_certificate_environmental;
CREATE POLICY "weight_cert_env_select" ON public.weight_calibration_certificate_environmental FOR SELECT
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_env_insert" ON public.weight_calibration_certificate_environmental;
CREATE POLICY "weight_cert_env_insert" ON public.weight_calibration_certificate_environmental FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_env_update" ON public.weight_calibration_certificate_environmental;
CREATE POLICY "weight_cert_env_update" ON public.weight_calibration_certificate_environmental FOR UPDATE
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)))
  WITH CHECK (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_env_delete" ON public.weight_calibration_certificate_environmental;
CREATE POLICY "weight_cert_env_delete" ON public.weight_calibration_certificate_environmental FOR DELETE
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));

DROP POLICY IF EXISTS "weight_cert_reviews_select" ON public.weight_calibration_certificate_reviews;
CREATE POLICY "weight_cert_reviews_select" ON public.weight_calibration_certificate_reviews FOR SELECT
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_reviews_insert" ON public.weight_calibration_certificate_reviews;
CREATE POLICY "weight_cert_reviews_insert" ON public.weight_calibration_certificate_reviews FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_reviews_update" ON public.weight_calibration_certificate_reviews;
CREATE POLICY "weight_cert_reviews_update" ON public.weight_calibration_certificate_reviews FOR UPDATE
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)))
  WITH CHECK (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));
DROP POLICY IF EXISTS "weight_cert_reviews_delete" ON public.weight_calibration_certificate_reviews;
CREATE POLICY "weight_cert_reviews_delete" ON public.weight_calibration_certificate_reviews FOR DELETE
  USING (public.cadastro_tenant_access(public.weight_calibration_certificate_tenant_from_child(certificate_id)));

DROP POLICY IF EXISTS "weight_cert_email_select" ON public.weight_certificate_email_deliveries;
CREATE POLICY "weight_cert_email_select" ON public.weight_certificate_email_deliveries FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "weight_cert_email_insert" ON public.weight_certificate_email_deliveries;
CREATE POLICY "weight_cert_email_insert" ON public.weight_certificate_email_deliveries FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

-- Lista Mestra: RE-5.4.2A / RE-5.4.2B
INSERT INTO public.master_documents (
  tenant_id, code, title, type, category, reference, current_revision,
  current_issue_date, current_revision_date, status, file_naming_rule,
  export_file_name_pattern, template_key, linked_module, export_template_config
)
SELECT
  t.id,
  'RE-5.4.2A',
  'Coleta de Dados — Calibração de Pesos-Padrão',
  'registro',
  'Calibração',
  'PR-7.2',
  '00',
  CURRENT_DATE,
  CURRENT_DATE,
  'ativo',
  'Código + Título + Revisão + Cliente e Data',
  '{codigo}_{titulo}_Rev{revisao}_{cliente}_{data}',
  're-542a-coleta-peso-padrao-pdf',
  'PR-7.2',
  '{}'::jsonb
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_documents md
  WHERE md.tenant_id = t.id AND md.code = 'RE-5.4.2A'
);

INSERT INTO public.master_documents (
  tenant_id, code, title, type, category, reference, current_revision,
  current_issue_date, current_revision_date, status, file_naming_rule,
  export_file_name_pattern, template_key, linked_module, export_template_config
)
SELECT
  t.id,
  'RE-5.4.2B',
  'Certificado de Calibração de Pesos',
  'registro',
  'Calibração',
  'PR-7.2',
  '03',
  CURRENT_DATE,
  CURRENT_DATE,
  'ativo',
  'Código + Título + Revisão + Número, Cliente e Identificação',
  '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{numeroSerie}',
  're-542b-certificado-peso-padrao-pdf',
  'PR-7.2',
  jsonb_build_object(
    'certificateObservations',
    jsonb_build_object(
      'rbc', jsonb_build_array(
        'O ajuste ou recuperação dos pesos, quando for realizado, não pertence ao escopo de acreditação do laboratório.',
        'Os resultados apresentados referem-se exclusivamente ao instrumento acima caracterizado, não sendo extensivos a quaisquer lotes. Uma cópia deste certificado será arquivada por cinco anos.',
        'A calibração foi realizada utilizando peso padrão de referência rastreáveis ao Sistema Internacional de Unidades.',
        'A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.',
        'Este certificado só poderá ser utilizado para fins publicitários e/ou promocionais quando autorizado pelo laboratório.',
        'Esta calibração não isenta o instrumento de controle metrológico estabelecido na regulamentação metrológica.',
        'A calibração foi realizada nas dependências do laboratório.'
      ),
      'rastreavel', jsonb_build_array(
        'O ajuste ou recuperação dos pesos, quando for realizado, não pertence ao escopo de acreditação do laboratório.',
        'Os resultados apresentados referem-se exclusivamente ao instrumento acima caracterizado, não sendo extensivos a quaisquer lotes. Uma cópia deste certificado será arquivada por cinco anos.',
        'A calibração foi realizada utilizando peso padrão de referência rastreáveis ao Sistema Internacional de Unidades.',
        'A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.',
        'Este certificado só poderá ser utilizado para fins publicitários e/ou promocionais quando autorizado pelo laboratório.',
        'Esta calibração não isenta o instrumento de controle metrológico estabelecido na regulamentação metrológica.',
        'A calibração foi realizada nas dependências do laboratório.'
      )
    )
  )
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_documents md
  WHERE md.tenant_id = t.id AND md.code = 'RE-5.4.2B'
);

INSERT INTO public.document_template_links (tenant_id, master_document_id, template_key, module_name, is_default, is_active)
SELECT md.tenant_id, md.id, md.template_key, 'PR-7.2', true, true
FROM public.master_documents md
WHERE md.code IN ('RE-5.4.2A', 'RE-5.4.2B')
  AND md.template_key IS NOT NULL
  AND md.template_key <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.document_template_links dtl
    WHERE dtl.master_document_id = md.id AND dtl.template_key = md.template_key
  );

-- Idempotente para novos tenants após seed da Lista Mestra
CREATE OR REPLACE FUNCTION public.ensure_weight_calibration_master_documents(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.master_documents (
    tenant_id, code, title, type, category, reference, current_revision,
    current_issue_date, current_revision_date, status, file_naming_rule,
    export_file_name_pattern, template_key, linked_module, export_template_config
  )
  SELECT
    p_tenant_id,
    'RE-5.4.2A',
    'Coleta de Dados — Calibração de Pesos-Padrão',
    'registro', 'Calibração', 'PR-7.2', '00',
    CURRENT_DATE, CURRENT_DATE, 'ativo',
    'Código + Título + Revisão + Cliente e Data',
    '{codigo}_{titulo}_Rev{revisao}_{cliente}_{data}',
    're-542a-coleta-peso-padrao-pdf', 'PR-7.2', '{}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM public.master_documents md
    WHERE md.tenant_id = p_tenant_id AND md.code = 'RE-5.4.2A'
  );

  INSERT INTO public.master_documents (
    tenant_id, code, title, type, category, reference, current_revision,
    current_issue_date, current_revision_date, status, file_naming_rule,
    export_file_name_pattern, template_key, linked_module, export_template_config
  )
  SELECT
    p_tenant_id,
    'RE-5.4.2B',
    'Certificado de Calibração de Pesos',
    'registro', 'Calibração', 'PR-7.2', '03',
    CURRENT_DATE, CURRENT_DATE, 'ativo',
    'Código + Título + Revisão + Número, Cliente e Identificação',
    '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{numeroSerie}',
    're-542b-certificado-peso-padrao-pdf', 'PR-7.2',
    jsonb_build_object(
      'certificateObservations',
      jsonb_build_object(
        'rbc', jsonb_build_array(
          'O ajuste ou recuperação dos pesos, quando for realizado, não pertence ao escopo de acreditação do laboratório.',
          'Os resultados apresentados referem-se exclusivamente ao instrumento acima caracterizado, não sendo extensivos a quaisquer lotes. Uma cópia deste certificado será arquivada por cinco anos.',
          'A calibração foi realizada utilizando peso padrão de referência rastreáveis ao Sistema Internacional de Unidades.',
          'A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.',
          'Este certificado só poderá ser utilizado para fins publicitários e/ou promocionais quando autorizado pelo laboratório.',
          'Esta calibração não isenta o instrumento de controle metrológico estabelecido na regulamentação metrológica.',
          'A calibração foi realizada nas dependências do laboratório.'
        ),
        'rastreavel', jsonb_build_array(
          'O ajuste ou recuperação dos pesos, quando for realizado, não pertence ao escopo de acreditação do laboratório.',
          'Os resultados apresentados referem-se exclusivamente ao instrumento acima caracterizado, não sendo extensivos a quaisquer lotes. Uma cópia deste certificado será arquivada por cinco anos.',
          'A calibração foi realizada utilizando peso padrão de referência rastreáveis ao Sistema Internacional de Unidades.',
          'A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.',
          'Este certificado só poderá ser utilizado para fins publicitários e/ou promocionais quando autorizado pelo laboratório.',
          'Esta calibração não isenta o instrumento de controle metrológico estabelecido na regulamentação metrológica.',
          'A calibração foi realizada nas dependências do laboratório.'
        )
      )
    )
  WHERE NOT EXISTS (
    SELECT 1 FROM public.master_documents md
    WHERE md.tenant_id = p_tenant_id AND md.code = 'RE-5.4.2B'
  );

  INSERT INTO public.document_template_links (tenant_id, master_document_id, template_key, module_name, is_default, is_active)
  SELECT md.tenant_id, md.id, md.template_key, 'PR-7.2', true, true
  FROM public.master_documents md
  WHERE md.tenant_id = p_tenant_id
    AND md.code IN ('RE-5.4.2A', 'RE-5.4.2B')
    AND COALESCE(md.template_key, '') <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.document_template_links dtl
      WHERE dtl.master_document_id = md.id AND dtl.template_key = md.template_key
    );
END;
$$;
