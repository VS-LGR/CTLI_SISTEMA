-- Proposta Comercial (RE-7.1A)

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS commercial_proposal_form_code text NOT NULL DEFAULT 'RE-7.1A',
  ADD COLUMN IF NOT EXISTS commercial_proposal_form_title text NOT NULL DEFAULT 'Proposta Comercial',
  ADD COLUMN IF NOT EXISTS commercial_proposal_form_revision text NOT NULL DEFAULT 'Rev.00 de 30.06.2025',
  ADD COLUMN IF NOT EXISTS commercial_proposal_boilerplate jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.commercial_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  proposal_number integer NOT NULL,
  proposal_year integer NOT NULL,
  proposal_date date,
  document_code text NOT NULL DEFAULT 'RE-7.1A',
  document_reference text NOT NULL DEFAULT 'PR-7.1',
  document_revision text NOT NULL DEFAULT '00',
  document_model_issue_date date NOT NULL DEFAULT '2025-06-30',
  subject text NOT NULL DEFAULT '',
  end_customer_id uuid REFERENCES public.end_customer_registrations (id) ON DELETE SET NULL,
  client_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  adjust_before text NOT NULL DEFAULT '',
  adjust_after text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  total_value numeric(14, 2) NOT NULL DEFAULT 0,
  exported_customer_at timestamptz,
  exported_scales_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, proposal_year, proposal_number)
);

CREATE INDEX IF NOT EXISTS idx_commercial_proposals_tenant
  ON public.commercial_proposals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_commercial_proposals_date
  ON public.commercial_proposals (tenant_id, proposal_date DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.commercial_proposal_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.commercial_proposals (id) ON DELETE CASCADE,
  item_number integer NOT NULL DEFAULT 1,
  manufacturer text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '',
  serial_number text NOT NULL DEFAULT '',
  capacity text NOT NULL DEFAULT '',
  resolution text NOT NULL DEFAULT '',
  unit_value numeric(14, 2) NOT NULL DEFAULT 0,
  scale_registration_id uuid REFERENCES public.scale_registrations (id) ON DELETE SET NULL,
  collection_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_commercial_proposal_scales_proposal
  ON public.commercial_proposal_scales (proposal_id);

CREATE TABLE IF NOT EXISTS public.commercial_proposal_calibration_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id uuid NOT NULL REFERENCES public.commercial_proposal_scales (id) ON DELETE CASCADE,
  point_number integer NOT NULL CHECK (point_number >= 1 AND point_number <= 10),
  nominal_value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scale_id, point_number)
);

CREATE INDEX IF NOT EXISTS idx_commercial_proposal_cal_points_scale
  ON public.commercial_proposal_calibration_points (scale_id);

ALTER TABLE public.scale_calibration_collections
  ADD COLUMN IF NOT EXISTS commercial_proposal_id uuid REFERENCES public.commercial_proposals (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commercial_proposal_scale_id uuid REFERENCES public.commercial_proposal_scales (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scale_cal_coll_proposal
  ON public.scale_calibration_collections (commercial_proposal_id);

CREATE OR REPLACE FUNCTION public.commercial_proposal_tenant_from_child(p_proposal_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.commercial_proposals WHERE id = p_proposal_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.commercial_proposal_scale_tenant_from_child(p_scale_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.tenant_id
  FROM public.commercial_proposal_scales cps
  JOIN public.commercial_proposals cp ON cp.id = cps.proposal_id
  WHERE cps.id = p_scale_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.touch_commercial_proposal_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_proposals_touch ON public.commercial_proposals;
CREATE TRIGGER trg_commercial_proposals_touch
  BEFORE UPDATE ON public.commercial_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_commercial_proposal_updated();

DROP TRIGGER IF EXISTS trg_commercial_proposal_scales_touch ON public.commercial_proposal_scales;
CREATE TRIGGER trg_commercial_proposal_scales_touch
  BEFORE UPDATE ON public.commercial_proposal_scales
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_commercial_proposal_updated();

ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_proposal_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_proposal_calibration_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cp_select" ON public.commercial_proposals;
CREATE POLICY "cp_select" ON public.commercial_proposals FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "cp_insert" ON public.commercial_proposals;
CREATE POLICY "cp_insert" ON public.commercial_proposals FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "cp_update" ON public.commercial_proposals;
CREATE POLICY "cp_update" ON public.commercial_proposals FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "cp_delete" ON public.commercial_proposals;
CREATE POLICY "cp_delete" ON public.commercial_proposals FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "cps_select" ON public.commercial_proposal_scales;
CREATE POLICY "cps_select" ON public.commercial_proposal_scales FOR SELECT
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)));
DROP POLICY IF EXISTS "cps_insert" ON public.commercial_proposal_scales;
CREATE POLICY "cps_insert" ON public.commercial_proposal_scales FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)));
DROP POLICY IF EXISTS "cps_update" ON public.commercial_proposal_scales;
CREATE POLICY "cps_update" ON public.commercial_proposal_scales FOR UPDATE
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)))
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)));
DROP POLICY IF EXISTS "cps_delete" ON public.commercial_proposal_scales;
CREATE POLICY "cps_delete" ON public.commercial_proposal_scales FOR DELETE
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)));

DROP POLICY IF EXISTS "cpcp_select" ON public.commercial_proposal_calibration_points;
CREATE POLICY "cpcp_select" ON public.commercial_proposal_calibration_points FOR SELECT
  USING (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)));
DROP POLICY IF EXISTS "cpcp_insert" ON public.commercial_proposal_calibration_points;
CREATE POLICY "cpcp_insert" ON public.commercial_proposal_calibration_points FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)));
DROP POLICY IF EXISTS "cpcp_update" ON public.commercial_proposal_calibration_points;
CREATE POLICY "cpcp_update" ON public.commercial_proposal_calibration_points FOR UPDATE
  USING (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)))
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)));
DROP POLICY IF EXISTS "cpcp_delete" ON public.commercial_proposal_calibration_points;
CREATE POLICY "cpcp_delete" ON public.commercial_proposal_calibration_points FOR DELETE
  USING (public.cadastro_tenant_access(public.commercial_proposal_scale_tenant_from_child(scale_id)));

ALTER TABLE public.commercial_proposal_scales
  DROP CONSTRAINT IF EXISTS commercial_proposal_scales_collection_id_fkey;
ALTER TABLE public.commercial_proposal_scales
  ADD CONSTRAINT commercial_proposal_scales_collection_id_fkey
  FOREIGN KEY (collection_id) REFERENCES public.scale_calibration_collections (id) ON DELETE SET NULL;
