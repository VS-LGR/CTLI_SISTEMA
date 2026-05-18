-- Coleta de dados para calibração de balança (RE-7.2A) + papel tecnico_campo

-- Expandir roles em profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'diretor',
    'gerente_qualidade',
    'gerente_tecnico',
    'administrativo_vendas',
    'client',
    'tecnico_campo'
  ));

CREATE TABLE IF NOT EXISTS public.scale_calibration_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  commercial_proposal_ref text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_name text NOT NULL DEFAULT '',
  responsible_name text NOT NULL DEFAULT '',
  scale_serial text NOT NULL DEFAULT '',
  calibration_date date,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scale_cal_coll_tenant_updated
  ON public.scale_calibration_collections (tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_scale_cal_coll_tenant_cal_date
  ON public.scale_calibration_collections (tenant_id, calibration_date DESC NULLS LAST);

-- RLS: admin global; client e tecnico_campo apenas no próprio tenant
CREATE OR REPLACE FUNCTION public.coleta_access(tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tid IS NOT NULL
    AND (
      public.is_admin()
      OR (
        tid = public.my_tenant_id()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('client', 'tecnico_campo')
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.touch_scale_cal_collection_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scale_cal_coll_touch ON public.scale_calibration_collections;
CREATE TRIGGER trg_scale_cal_coll_touch
  BEFORE UPDATE ON public.scale_calibration_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_scale_cal_collection_updated();

ALTER TABLE public.scale_calibration_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scale_cal_coll_select" ON public.scale_calibration_collections;
CREATE POLICY "scale_cal_coll_select" ON public.scale_calibration_collections FOR SELECT
  USING (public.coleta_access(tenant_id));

DROP POLICY IF EXISTS "scale_cal_coll_insert" ON public.scale_calibration_collections;
CREATE POLICY "scale_cal_coll_insert" ON public.scale_calibration_collections FOR INSERT
  WITH CHECK (public.coleta_access(tenant_id));

DROP POLICY IF EXISTS "scale_cal_coll_update" ON public.scale_calibration_collections;
CREATE POLICY "scale_cal_coll_update" ON public.scale_calibration_collections FOR UPDATE
  USING (public.coleta_access(tenant_id))
  WITH CHECK (public.coleta_access(tenant_id));

DROP POLICY IF EXISTS "scale_cal_coll_delete" ON public.scale_calibration_collections;
CREATE POLICY "scale_cal_coll_delete" ON public.scale_calibration_collections FOR DELETE
  USING (public.coleta_access(tenant_id));
