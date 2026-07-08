-- Cadastro de computadores/veículos (PR-6.4) + verificações anuais RE-6.4.12B

CREATE TABLE IF NOT EXISTS public.equipment_computers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  identification text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  operating_system text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  responsible text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_computers_tenant
  ON public.equipment_computers (tenant_id, identification);

DROP TRIGGER IF EXISTS trg_equipment_computers_touch ON public.equipment_computers;
CREATE TRIGGER trg_equipment_computers_touch
  BEFORE UPDATE ON public.equipment_computers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.equipment_computers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_computers_select" ON public.equipment_computers;
CREATE POLICY "equipment_computers_select" ON public.equipment_computers FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "equipment_computers_insert" ON public.equipment_computers;
CREATE POLICY "equipment_computers_insert" ON public.equipment_computers FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "equipment_computers_update" ON public.equipment_computers;
CREATE POLICY "equipment_computers_update" ON public.equipment_computers FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "equipment_computers_delete" ON public.equipment_computers;
CREATE POLICY "equipment_computers_delete" ON public.equipment_computers FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

CREATE TABLE IF NOT EXISTS public.equipment_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  identification text NOT NULL DEFAULT '',
  plate text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  year integer,
  usage_description text NOT NULL DEFAULT '',
  responsible text NOT NULL DEFAULT '',
  documentation_notes text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_vehicles_tenant
  ON public.equipment_vehicles (tenant_id, identification);

DROP TRIGGER IF EXISTS trg_equipment_vehicles_touch ON public.equipment_vehicles;
CREATE TRIGGER trg_equipment_vehicles_touch
  BEFORE UPDATE ON public.equipment_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.equipment_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_vehicles_select" ON public.equipment_vehicles;
CREATE POLICY "equipment_vehicles_select" ON public.equipment_vehicles FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "equipment_vehicles_insert" ON public.equipment_vehicles;
CREATE POLICY "equipment_vehicles_insert" ON public.equipment_vehicles FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "equipment_vehicles_update" ON public.equipment_vehicles;
CREATE POLICY "equipment_vehicles_update" ON public.equipment_vehicles FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "equipment_vehicles_delete" ON public.equipment_vehicles;
CREATE POLICY "equipment_vehicles_delete" ON public.equipment_vehicles FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

CREATE TABLE IF NOT EXISTS public.equipment_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  equipment_kind text NOT NULL
    CHECK (equipment_kind IN ('pesos', 'thermo', 'computador', 'veiculo')),
  year integer NOT NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  responsible_by_month jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurrences text NOT NULL DEFAULT '',
  issued_approved_by text NOT NULL DEFAULT '',
  issue_date date,
  linked_asset_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipment_verifications_tenant_kind_year_unique UNIQUE (tenant_id, equipment_kind, year)
);

CREATE INDEX IF NOT EXISTS idx_equipment_verifications_tenant
  ON public.equipment_verifications (tenant_id, equipment_kind, year DESC);

DROP TRIGGER IF EXISTS trg_equipment_verifications_touch ON public.equipment_verifications;
CREATE TRIGGER trg_equipment_verifications_touch
  BEFORE UPDATE ON public.equipment_verifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.equipment_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_verifications_select" ON public.equipment_verifications;
CREATE POLICY "equipment_verifications_select" ON public.equipment_verifications FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "equipment_verifications_insert" ON public.equipment_verifications;
CREATE POLICY "equipment_verifications_insert" ON public.equipment_verifications FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "equipment_verifications_update" ON public.equipment_verifications;
CREATE POLICY "equipment_verifications_update" ON public.equipment_verifications FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "equipment_verifications_delete" ON public.equipment_verifications;
CREATE POLICY "equipment_verifications_delete" ON public.equipment_verifications FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));
