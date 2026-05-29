-- Ponte Solicitação de Orçamento → Pedido de Compra

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS quotation_request_id uuid REFERENCES public.quotation_requests (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_quotation_request
  ON public.purchase_orders (quotation_request_id);

CREATE TABLE IF NOT EXISTS public.quotation_request_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_request_id uuid NOT NULL REFERENCES public.quotation_requests (id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders (id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK (section_type IN (
    'ensaio_proficiencia',
    'auditoria_interna',
    'calibracao_termo_baro_higrometro',
    'calibracao_pesos_padrao',
    'treinamento',
    'aquisicao_termo_baro_higrometro',
    'aquisicao_pesos_padrao'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_request_id, section_type),
  UNIQUE (purchase_order_id)
);

CREATE INDEX IF NOT EXISTS idx_qr_conversions_request
  ON public.quotation_request_conversions (quotation_request_id);

CREATE OR REPLACE FUNCTION public.quotation_conversion_tenant_from_child(p_request_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.quotation_requests WHERE id = p_request_id LIMIT 1;
$$;

ALTER TABLE public.quotation_request_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_conv_select" ON public.quotation_request_conversions;
CREATE POLICY "qr_conv_select" ON public.quotation_request_conversions FOR SELECT
  USING (public.cadastro_tenant_access(public.quotation_conversion_tenant_from_child(quotation_request_id)));

DROP POLICY IF EXISTS "qr_conv_insert" ON public.quotation_request_conversions;
CREATE POLICY "qr_conv_insert" ON public.quotation_request_conversions FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.quotation_conversion_tenant_from_child(quotation_request_id)));

DROP POLICY IF EXISTS "qr_conv_delete" ON public.quotation_request_conversions;
CREATE POLICY "qr_conv_delete" ON public.quotation_request_conversions FOR DELETE
  USING (public.cadastro_tenant_access(public.quotation_conversion_tenant_from_child(quotation_request_id)));
