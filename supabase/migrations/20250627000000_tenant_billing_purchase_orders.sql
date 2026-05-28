-- Dados de faturamento do ambiente + módulo Pedidos de Compra

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS legal_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS trade_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_cep text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_state text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_cnpj text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_state_registration text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS environment_responsible_name text NOT NULL DEFAULT '';

ALTER TABLE public.employee_registrations
  ADD COLUMN IF NOT EXISTS signature_storage_path text;

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  order_number integer NOT NULL,
  order_year integer NOT NULL,
  type text NOT NULL CHECK (type IN (
    'calibracao_pesos_padrao',
    'calibracao_termo_baro_higrometro',
    'compra_pesos',
    'compra_termo_baro_higrometro',
    'auditoria_interna',
    'ensaio_proficiencia'
  )),
  title text NOT NULL DEFAULT '',
  supplier_id uuid REFERENCES public.supplier_registrations (id) ON DELETE SET NULL,
  supplier_data_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_environment_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE RESTRICT,
  client_environment_data_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  technical_manager_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  purchase_responsible_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN (
    'rascunho',
    'aguardando_aprovacao_tecnica',
    'aprovado_tecnicamente',
    'enviado_fornecedor',
    'aguardando_recebimento',
    'recebido_parcialmente',
    'recebido',
    'reprovado_recebimento',
    'cancelado'
  )),
  order_date date,
  issue_date date,
  payment_terms text NOT NULL DEFAULT '',
  freight_responsibility text NOT NULL DEFAULT '',
  carrier_info text NOT NULL DEFAULT '',
  quotation_number text NOT NULL DEFAULT '',
  execution_period text NOT NULL DEFAULT '',
  observations text NOT NULL DEFAULT 'Constar na Nota Fiscal: Nº Pedido, Forma de Pagamento e Vencimento.',
  discount numeric(14, 2) NOT NULL DEFAULT 0,
  taxes_mode text NOT NULL DEFAULT 'incluso' CHECK (taxes_mode IN ('incluso', 'percentual', 'nenhum')),
  subtotal numeric(14, 2) NOT NULL DEFAULT 0,
  final_value numeric(14, 2) NOT NULL DEFAULT 0,
  document_code text NOT NULL DEFAULT 'RE-6.6B',
  document_revision text NOT NULL DEFAULT '00',
  document_reference text NOT NULL DEFAULT 'PR-6.6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, order_year, order_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.purchase_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_type ON public.purchase_orders (tenant_id, type);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  item_number integer NOT NULL DEFAULT 1,
  equipment text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT '',
  identification_codes text NOT NULL DEFAULT '',
  nominal_values text NOT NULL DEFAULT '',
  range_text text NOT NULL DEFAULT '',
  class_text text NOT NULL DEFAULT '',
  magnitude text NOT NULL DEFAULT '',
  minimum_reading_range text NOT NULL DEFAULT '',
  acceptable_resolution text NOT NULL DEFAULT '',
  max_error_uncertainty text NOT NULL DEFAULT '',
  hiring_criteria text NOT NULL DEFAULT '',
  program_name text NOT NULL DEFAULT '',
  artifacts_description text NOT NULL DEFAULT '',
  audit_scope text NOT NULL DEFAULT '',
  quantity numeric(14, 3) NOT NULL DEFAULT 1,
  unit_value numeric(14, 2) NOT NULL DEFAULT 0,
  taxes_percent numeric(8, 2) NOT NULL DEFAULT 0,
  taxes_included boolean NOT NULL DEFAULT true,
  total_value numeric(14, 2) NOT NULL DEFAULT 0,
  linked_weight_ids uuid[] NOT NULL DEFAULT '{}',
  linked_certificate_ids uuid[] NOT NULL DEFAULT '{}',
  linked_env_cert_id uuid REFERENCES public.environment_sensor_certificates (id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_items_order ON public.purchase_order_items (purchase_order_id);

CREATE TABLE IF NOT EXISTS public.purchase_order_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL UNIQUE REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  received_matches_order boolean,
  certificate_matches_order boolean,
  certificate_numbers text NOT NULL DEFAULT '',
  supplier_sent_report boolean,
  report_matches_order boolean,
  reason text NOT NULL DEFAULT '',
  result text CHECK (result IS NULL OR result IN ('aceito', 'reprovado')),
  inspection_responsible_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  inspection_date date,
  notes text NOT NULL DEFAULT '',
  type_specific jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('technical_manager', 'purchase', 'inspection')),
  employee_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_order_id, role)
);

CREATE TABLE IF NOT EXISTS public.purchase_order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.next_purchase_order_number(p_tenant_id uuid, p_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO n
  FROM public.purchase_orders
  WHERE tenant_id = p_tenant_id AND order_year = p_year
  FOR UPDATE;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_order_tenant_from_item(p_order_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.purchase_orders WHERE id = p_order_id LIMIT 1;
$$;

DROP TRIGGER IF EXISTS trg_purchase_orders_touch ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_touch
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_po_items_touch ON public.purchase_order_items;
CREATE TRIGGER trg_po_items_touch
  BEFORE UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_po_inspection_touch ON public.purchase_order_inspections;
CREATE TRIGGER trg_po_inspection_touch
  BEFORE UPDATE ON public.purchase_order_inspections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "po_select" ON public.purchase_orders;
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "po_insert" ON public.purchase_orders;
CREATE POLICY "po_insert" ON public.purchase_orders FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "po_update" ON public.purchase_orders;
CREATE POLICY "po_update" ON public.purchase_orders FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "po_delete" ON public.purchase_orders;
CREATE POLICY "po_delete" ON public.purchase_orders FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "po_items_select" ON public.purchase_order_items;
CREATE POLICY "po_items_select" ON public.purchase_order_items FOR SELECT
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_items_insert" ON public.purchase_order_items;
CREATE POLICY "po_items_insert" ON public.purchase_order_items FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_items_update" ON public.purchase_order_items;
CREATE POLICY "po_items_update" ON public.purchase_order_items FOR UPDATE
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)))
  WITH CHECK (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_items_delete" ON public.purchase_order_items;
CREATE POLICY "po_items_delete" ON public.purchase_order_items FOR DELETE
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));

DROP POLICY IF EXISTS "po_insp_select" ON public.purchase_order_inspections;
CREATE POLICY "po_insp_select" ON public.purchase_order_inspections FOR SELECT
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_insp_insert" ON public.purchase_order_inspections;
CREATE POLICY "po_insp_insert" ON public.purchase_order_inspections FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_insp_update" ON public.purchase_order_inspections;
CREATE POLICY "po_insp_update" ON public.purchase_order_inspections FOR UPDATE
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)))
  WITH CHECK (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_insp_delete" ON public.purchase_order_inspections;
CREATE POLICY "po_insp_delete" ON public.purchase_order_inspections FOR DELETE
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));

DROP POLICY IF EXISTS "po_sig_select" ON public.purchase_order_signatures;
CREATE POLICY "po_sig_select" ON public.purchase_order_signatures FOR SELECT
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_sig_insert" ON public.purchase_order_signatures;
CREATE POLICY "po_sig_insert" ON public.purchase_order_signatures FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_sig_update" ON public.purchase_order_signatures;
CREATE POLICY "po_sig_update" ON public.purchase_order_signatures FOR UPDATE
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)))
  WITH CHECK (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_sig_delete" ON public.purchase_order_signatures;
CREATE POLICY "po_sig_delete" ON public.purchase_order_signatures FOR DELETE
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));

DROP POLICY IF EXISTS "po_att_select" ON public.purchase_order_attachments;
CREATE POLICY "po_att_select" ON public.purchase_order_attachments FOR SELECT
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_att_insert" ON public.purchase_order_attachments;
CREATE POLICY "po_att_insert" ON public.purchase_order_attachments FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
DROP POLICY IF EXISTS "po_att_delete" ON public.purchase_order_attachments;
CREATE POLICY "po_att_delete" ON public.purchase_order_attachments FOR DELETE
  USING (public.cadastro_tenant_access(public.purchase_order_tenant_from_item(purchase_order_id)));
