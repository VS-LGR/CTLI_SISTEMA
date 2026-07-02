-- Modelo de ambiente: full (CTLI/interno) | client_portal (cliente comercial)

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS deployment_model text NOT NULL DEFAULT 'full'
  CHECK (deployment_model IN ('full', 'client_portal'));

COMMENT ON COLUMN public.tenants.deployment_model IS
  'full = ambiente interno CTLI; client_portal = portal enxuto para clientes finais';
