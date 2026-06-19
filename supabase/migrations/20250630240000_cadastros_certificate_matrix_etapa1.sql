-- Etapa 1: cadastros alinhados à matriz de emissão RE-7.2B

ALTER TABLE public.end_customer_registrations
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT '';

ALTER TABLE public.scale_registrations
  ADD COLUMN IF NOT EXISTS end_customer_id uuid REFERENCES public.end_customer_registrations (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tag text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS local_instalacao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS etiqueta_ipem text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS portaria_inmetro text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_balanca text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_scale_registrations_end_customer
  ON public.scale_registrations (tenant_id, end_customer_id);

ALTER TABLE public.standard_weight_items
  ADD COLUMN IF NOT EXISTS previous_conventional_value text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS standard_drift text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS weight_status text NOT NULL DEFAULT '';
