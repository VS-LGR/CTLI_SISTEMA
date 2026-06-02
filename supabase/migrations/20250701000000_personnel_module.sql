-- Módulo 6.2 — Pessoal (cargos, adequação, monitoramento, listas padrão)

CREATE TABLE IF NOT EXISTS public.personnel_standard_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'education_level',
    'internal_training',
    'general_knowledge',
    'technical_knowledge',
    'skill',
    'qualification',
    'experience',
    'monitoring_method',
    'monitoring_reason',
    'training_classification',
    'suitability_status',
    'training_need'
  )),
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, category, label)
);

CREATE INDEX IF NOT EXISTS idx_personnel_standard_options_tenant ON public.personnel_standard_options (tenant_id, category);

CREATE TABLE IF NOT EXISTS public.personnel_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  title text NOT NULL,
  inclusion_date date NOT NULL DEFAULT CURRENT_DATE,
  last_update_date date NOT NULL DEFAULT CURRENT_DATE,
  required_education text NOT NULL DEFAULT '',
  desired_education text NOT NULL DEFAULT '',
  technical_knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  qualification jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  general_knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  immediate_supervisor text NOT NULL DEFAULT '',
  function_activities text NOT NULL DEFAULT '',
  technical_authorities text NOT NULL DEFAULT '',
  managerial_authorities text NOT NULL DEFAULT '',
  internal_trainings jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis_approval_responsible_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  document_code text NOT NULL DEFAULT 'RE-6.2C',
  document_reference text NOT NULL DEFAULT 'RE-6.2',
  document_revision text NOT NULL DEFAULT '00',
  document_model_issue_date date NOT NULL DEFAULT '2025-06-30',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personnel_positions_tenant ON public.personnel_positions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_personnel_positions_status ON public.personnel_positions (tenant_id, status);

CREATE TABLE IF NOT EXISTS public.personnel_competency_adequacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employee_registrations (id) ON DELETE RESTRICT,
  position_id uuid NOT NULL REFERENCES public.personnel_positions (id) ON DELETE RESTRICT,
  employee_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  position_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  registration_number text NOT NULL DEFAULT '',
  admission_date date,
  last_update_date date NOT NULL DEFAULT CURRENT_DATE,
  occupant_name text NOT NULL DEFAULT '',
  position_title text NOT NULL DEFAULT '',
  current_education text NOT NULL DEFAULT '',
  immediate_supervisor text NOT NULL DEFAULT '',
  technical_knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  qualification jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  general_knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  function_activities text NOT NULL DEFAULT '',
  technical_authorities text NOT NULL DEFAULT '',
  managerial_authorities text NOT NULL DEFAULT '',
  internal_trainings jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis_approval_responsible_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  analysis_approval_responsible_name text NOT NULL DEFAULT '',
  adequacy_status text NOT NULL DEFAULT 'rascunho' CHECK (adequacy_status IN ('rascunho', 'concluida')),
  notes text NOT NULL DEFAULT '',
  document_code text NOT NULL DEFAULT 'RE-6.2A',
  document_reference text NOT NULL DEFAULT 'RE-6.2',
  document_revision text NOT NULL DEFAULT '00',
  document_model_issue_date date NOT NULL DEFAULT '2025-06-30',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personnel_adequacies_tenant ON public.personnel_competency_adequacies (tenant_id);
CREATE INDEX IF NOT EXISTS idx_personnel_adequacies_employee ON public.personnel_competency_adequacies (employee_id);

CREATE TABLE IF NOT EXISTS public.personnel_monitorings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employee_registrations (id) ON DELETE RESTRICT,
  position_id uuid NOT NULL REFERENCES public.personnel_positions (id) ON DELETE RESTRICT,
  employee_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  position_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  registration_number text NOT NULL DEFAULT '',
  admission_date date,
  occupant_name text NOT NULL DEFAULT '',
  position_title text NOT NULL DEFAULT '',
  monitoring_reason text NOT NULL DEFAULT '',
  current_education text NOT NULL DEFAULT '',
  immediate_supervisor text NOT NULL DEFAULT '',
  technical_knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  qualification jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  general_knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_trainings jsonb NOT NULL DEFAULT '[]'::jsonb,
  needed_new_training text NOT NULL DEFAULT '',
  training_classification text NOT NULL DEFAULT '',
  training_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis_approval_responsible_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  analysis_approval_responsible_name text NOT NULL DEFAULT '',
  occupation_authorization_date date,
  supervision_period text NOT NULL DEFAULT '',
  monitoring_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_interlaboratory_date date,
  last_intralaboratory_date date,
  responsible_organization text NOT NULL DEFAULT '',
  report_number text NOT NULL DEFAULT '',
  last_update_date date NOT NULL DEFAULT CURRENT_DATE,
  next_monitoring_date date,
  employee_remains_suitable text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  document_code text NOT NULL DEFAULT 'RE-6.2E',
  document_reference text NOT NULL DEFAULT 'RE-6.2',
  document_revision text NOT NULL DEFAULT '00',
  document_model_issue_date date NOT NULL DEFAULT '2025-06-30',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personnel_monitorings_tenant ON public.personnel_monitorings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_personnel_monitorings_employee ON public.personnel_monitorings (employee_id);

-- FK colaborador → cargo (após personnel_positions)
ALTER TABLE public.employee_registrations
  ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.personnel_positions (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employee_registrations_position ON public.employee_registrations (tenant_id, position_id);

CREATE OR REPLACE FUNCTION public.employee_position_same_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.position_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.personnel_positions p
    WHERE p.id = NEW.position_id AND p.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'position_id deve pertencer ao mesmo tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employee_position_tenant ON public.employee_registrations;
CREATE TRIGGER trg_employee_position_tenant
  BEFORE INSERT OR UPDATE OF position_id, tenant_id ON public.employee_registrations
  FOR EACH ROW EXECUTE FUNCTION public.employee_position_same_tenant();

CREATE OR REPLACE FUNCTION public.personnel_position_analysis_same_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.analysis_approval_responsible_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.employee_registrations e
    WHERE e.id = NEW.analysis_approval_responsible_id AND e.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'analysis_approval_responsible_id deve pertencer ao mesmo tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_personnel_position_analysis_tenant ON public.personnel_positions;
CREATE TRIGGER trg_personnel_position_analysis_tenant
  BEFORE INSERT OR UPDATE OF analysis_approval_responsible_id, tenant_id ON public.personnel_positions
  FOR EACH ROW EXECUTE FUNCTION public.personnel_position_analysis_same_tenant();

DROP TRIGGER IF EXISTS trg_personnel_standard_options_touch ON public.personnel_standard_options;
CREATE TRIGGER trg_personnel_standard_options_touch
  BEFORE UPDATE ON public.personnel_standard_options
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_personnel_positions_touch ON public.personnel_positions;
CREATE TRIGGER trg_personnel_positions_touch
  BEFORE UPDATE ON public.personnel_positions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_personnel_adequacies_touch ON public.personnel_competency_adequacies;
CREATE TRIGGER trg_personnel_adequacies_touch
  BEFORE UPDATE ON public.personnel_competency_adequacies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_personnel_monitorings_touch ON public.personnel_monitorings;
CREATE TRIGGER trg_personnel_monitorings_touch
  BEFORE UPDATE ON public.personnel_monitorings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.personnel_standard_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_competency_adequacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_monitorings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pso_select" ON public.personnel_standard_options;
CREATE POLICY "pso_select" ON public.personnel_standard_options FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pso_insert" ON public.personnel_standard_options;
CREATE POLICY "pso_insert" ON public.personnel_standard_options FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pso_update" ON public.personnel_standard_options;
CREATE POLICY "pso_update" ON public.personnel_standard_options FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pso_delete" ON public.personnel_standard_options;
CREATE POLICY "pso_delete" ON public.personnel_standard_options FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "pp_select" ON public.personnel_positions;
CREATE POLICY "pp_select" ON public.personnel_positions FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pp_insert" ON public.personnel_positions;
CREATE POLICY "pp_insert" ON public.personnel_positions FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pp_update" ON public.personnel_positions;
CREATE POLICY "pp_update" ON public.personnel_positions FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pp_delete" ON public.personnel_positions;
CREATE POLICY "pp_delete" ON public.personnel_positions FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "pca_select" ON public.personnel_competency_adequacies;
CREATE POLICY "pca_select" ON public.personnel_competency_adequacies FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pca_insert" ON public.personnel_competency_adequacies;
CREATE POLICY "pca_insert" ON public.personnel_competency_adequacies FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pca_update" ON public.personnel_competency_adequacies;
CREATE POLICY "pca_update" ON public.personnel_competency_adequacies FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pca_delete" ON public.personnel_competency_adequacies;
CREATE POLICY "pca_delete" ON public.personnel_competency_adequacies FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "pm_select" ON public.personnel_monitorings;
CREATE POLICY "pm_select" ON public.personnel_monitorings FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pm_insert" ON public.personnel_monitorings;
CREATE POLICY "pm_insert" ON public.personnel_monitorings FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pm_update" ON public.personnel_monitorings;
CREATE POLICY "pm_update" ON public.personnel_monitorings FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "pm_delete" ON public.personnel_monitorings;
CREATE POLICY "pm_delete" ON public.personnel_monitorings FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));
