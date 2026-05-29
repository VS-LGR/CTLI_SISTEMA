-- Solicitação de Orçamento (RE-6.6C)

CREATE TABLE IF NOT EXISTS public.quotation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  request_number integer NOT NULL,
  request_year integer NOT NULL,
  request_date date,
  document_code text NOT NULL DEFAULT 'RE-6.6C',
  document_reference text NOT NULL DEFAULT 'PR-6.6',
  document_revision text NOT NULL DEFAULT '00',
  document_model_issue_date date NOT NULL DEFAULT '2025-06-30',
  client_environment_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  client_environment_data_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  supplier_id uuid REFERENCES public.supplier_registrations (id) ON DELETE SET NULL,
  supplier_data_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_by_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  sent_by_data_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho',
    'aguardando_envio',
    'enviada_fornecedor',
    'orcamento_recebido',
    'em_analise',
    'aprovada',
    'reprovada',
    'convertida_pedido_compra',
    'cancelada'
  )),
  notes text NOT NULL DEFAULT '',
  converted_purchase_order_id uuid REFERENCES public.purchase_orders (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, request_year, request_number)
);

CREATE INDEX IF NOT EXISTS idx_quotation_requests_tenant ON public.quotation_requests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_status ON public.quotation_requests (tenant_id, status);

CREATE TABLE IF NOT EXISTS public.quotation_request_type_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id uuid NOT NULL REFERENCES public.quotation_requests (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'ensaio_proficiencia',
    'auditoria_interna',
    'calibracao_termo_baro_higrometro',
    'calibracao_pesos_padrao',
    'treinamento',
    'aquisicao_termo_baro_higrometro',
    'aquisicao_pesos_padrao'
  )),
  is_selected boolean NOT NULL DEFAULT false,
  essay_scope text NOT NULL DEFAULT '',
  acquisition_criteria text NOT NULL DEFAULT '',
  default_criteria text NOT NULL DEFAULT '',
  custom_criteria text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_request_id, type)
);

CREATE INDEX IF NOT EXISTS idx_qr_sections_request ON public.quotation_request_type_sections (quotation_request_id);

CREATE TABLE IF NOT EXISTS public.quotation_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id uuid NOT NULL REFERENCES public.quotation_requests (id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK (section_type IN (
    'ensaio_proficiencia',
    'auditoria_interna',
    'calibracao_termo_baro_higrometro',
    'calibracao_pesos_padrao',
    'treinamento',
    'aquisicao_termo_baro_higrometro',
    'aquisicao_pesos_padrao'
  )),
  item_number integer NOT NULL DEFAULT 1,
  equipment text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT '',
  identification_codes text NOT NULL DEFAULT '',
  nominal_values_or_calibration_range text NOT NULL DEFAULT '',
  max_error_uncertainty_or_acceptance_criteria text NOT NULL DEFAULT '',
  quantity numeric(14, 3) NOT NULL DEFAULT 1,
  audit_scope text NOT NULL DEFAULT '',
  auditors text NOT NULL DEFAULT '',
  contracting_criteria text NOT NULL DEFAULT '',
  quantity_days numeric(8, 2) NOT NULL DEFAULT 0,
  training_name text NOT NULL DEFAULT '',
  participants_number integer NOT NULL DEFAULT 0,
  magnitude text NOT NULL DEFAULT '',
  minimum_reading_range text NOT NULL DEFAULT '',
  acceptable_resolution text NOT NULL DEFAULT '',
  linked_weight_ids uuid[] NOT NULL DEFAULT '{}',
  linked_certificate_ids uuid[] NOT NULL DEFAULT '{}',
  linked_env_cert_id uuid REFERENCES public.environment_sensor_certificates (id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_items_request ON public.quotation_request_items (quotation_request_id);

CREATE TABLE IF NOT EXISTS public.quotation_request_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id uuid NOT NULL REFERENCES public.quotation_requests (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotation_request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id uuid NOT NULL REFERENCES public.quotation_requests (id) ON DELETE CASCADE,
  old_status text NOT NULL DEFAULT '',
  new_status text NOT NULL,
  changed_by_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_history_request ON public.quotation_request_status_history (quotation_request_id);

CREATE OR REPLACE FUNCTION public.quotation_request_tenant_from_child(p_request_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.quotation_requests WHERE id = p_request_id LIMIT 1;
$$;

DROP TRIGGER IF EXISTS trg_quotation_requests_touch ON public.quotation_requests;
CREATE TRIGGER trg_quotation_requests_touch
  BEFORE UPDATE ON public.quotation_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_qr_sections_touch ON public.quotation_request_type_sections;
CREATE TRIGGER trg_qr_sections_touch
  BEFORE UPDATE ON public.quotation_request_type_sections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_qr_items_touch ON public.quotation_request_items;
CREATE TRIGGER trg_qr_items_touch
  BEFORE UPDATE ON public.quotation_request_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.quotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_request_type_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_request_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_select" ON public.quotation_requests;
CREATE POLICY "qr_select" ON public.quotation_requests FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "qr_insert" ON public.quotation_requests;
CREATE POLICY "qr_insert" ON public.quotation_requests FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "qr_update" ON public.quotation_requests;
CREATE POLICY "qr_update" ON public.quotation_requests FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "qr_delete" ON public.quotation_requests;
CREATE POLICY "qr_delete" ON public.quotation_requests FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "qr_sec_select" ON public.quotation_request_type_sections;
CREATE POLICY "qr_sec_select" ON public.quotation_request_type_sections FOR SELECT
  USING (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
DROP POLICY IF EXISTS "qr_sec_insert" ON public.quotation_request_type_sections;
CREATE POLICY "qr_sec_insert" ON public.quotation_request_type_sections FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
DROP POLICY IF EXISTS "qr_sec_update" ON public.quotation_request_type_sections;
CREATE POLICY "qr_sec_update" ON public.quotation_request_type_sections FOR UPDATE
  USING (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)))
  WITH CHECK (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
DROP POLICY IF EXISTS "qr_sec_delete" ON public.quotation_request_type_sections;
CREATE POLICY "qr_sec_delete" ON public.quotation_request_type_sections FOR DELETE
  USING (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));

DROP POLICY IF EXISTS "qr_items_select" ON public.quotation_request_items;
CREATE POLICY "qr_items_select" ON public.quotation_request_items FOR SELECT
  USING (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
DROP POLICY IF EXISTS "qr_items_insert" ON public.quotation_request_items;
CREATE POLICY "qr_items_insert" ON public.quotation_request_items FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
DROP POLICY IF EXISTS "qr_items_update" ON public.quotation_request_items;
CREATE POLICY "qr_items_update" ON public.quotation_request_items FOR UPDATE
  USING (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)))
  WITH CHECK (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
DROP POLICY IF EXISTS "qr_items_delete" ON public.quotation_request_items;
CREATE POLICY "qr_items_delete" ON public.quotation_request_items FOR DELETE
  USING (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));

DROP POLICY IF EXISTS "qr_att_select" ON public.quotation_request_attachments;
CREATE POLICY "qr_att_select" ON public.quotation_request_attachments FOR SELECT
  USING (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
DROP POLICY IF EXISTS "qr_att_insert" ON public.quotation_request_attachments;
CREATE POLICY "qr_att_insert" ON public.quotation_request_attachments FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
DROP POLICY IF EXISTS "qr_att_delete" ON public.quotation_request_attachments;
CREATE POLICY "qr_att_delete" ON public.quotation_request_attachments FOR DELETE
  USING (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));

DROP POLICY IF EXISTS "qr_hist_select" ON public.quotation_request_status_history;
CREATE POLICY "qr_hist_select" ON public.quotation_request_status_history FOR SELECT
  USING (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
DROP POLICY IF EXISTS "qr_hist_insert" ON public.quotation_request_status_history;
CREATE POLICY "qr_hist_insert" ON public.quotation_request_status_history FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.quotation_request_tenant_from_child(quotation_request_id)));
