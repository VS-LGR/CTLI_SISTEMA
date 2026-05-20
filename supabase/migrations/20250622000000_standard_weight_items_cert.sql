-- Pesos padrão: vínculo opcional com certificado de conjunto

ALTER TABLE public.standard_weight_items
  ADD COLUMN IF NOT EXISTS certificate_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS weight_certificate_id uuid REFERENCES public.weight_standard_certificates (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_standard_weight_items_cert
  ON public.standard_weight_items (tenant_id, weight_certificate_id);
