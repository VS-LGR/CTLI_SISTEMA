-- Módulo 6.2 — Complemento: Avaliação Experiência, Seleção, Lista de Presença

CREATE TABLE IF NOT EXISTS public.personnel_experience_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employee_registrations (id) ON DELETE RESTRICT,
  position_id uuid REFERENCES public.personnel_positions (id) ON DELETE SET NULL,
  employee_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  position_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  registration_number text NOT NULL DEFAULT '',
  occupant_name text NOT NULL DEFAULT '',
  admission_date date,
  position_title text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  evaluator_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  evaluator_name text NOT NULL DEFAULT '',
  evaluation_date date NOT NULL DEFAULT CURRENT_DATE,
  average_score numeric(5, 2),
  conclusive_opinion text NOT NULL DEFAULT '' CHECK (conclusive_opinion IN ('aprovado', 'reprovado', '')),
  signature_date date,
  notes text NOT NULL DEFAULT '',
  document_code text NOT NULL DEFAULT 'RE-6.2B',
  document_reference text NOT NULL DEFAULT 'PR-6.2',
  document_revision text NOT NULL DEFAULT '00',
  document_model_issue_date date NOT NULL DEFAULT '2025-06-30',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personnel_exp_eval_tenant ON public.personnel_experience_evaluations (tenant_id);

CREATE TABLE IF NOT EXISTS public.personnel_experience_evaluation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.personnel_experience_evaluations (id) ON DELETE CASCADE,
  item_number integer NOT NULL CHECK (item_number >= 1 AND item_number <= 10),
  description text NOT NULL DEFAULT '',
  score integer CHECK (score IN (0, 2, 4, 6, 8, 10)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_personnel_exp_eval_items_eval ON public.personnel_experience_evaluation_items (evaluation_id);

CREATE TABLE IF NOT EXISTS public.personnel_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  selection_date date NOT NULL DEFAULT CURRENT_DATE,
  vacancy text NOT NULL DEFAULT '',
  required_education_level text NOT NULL DEFAULT '',
  selection_conductor_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  selection_conductor_name text NOT NULL DEFAULT '',
  candidate_name text NOT NULL DEFAULT '',
  position_id uuid REFERENCES public.personnel_positions (id) ON DELETE SET NULL,
  position_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  position_title text NOT NULL DEFAULT '',
  selected_education_levels jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_position_attributions jsonb NOT NULL DEFAULT '{"function_activities":true,"technical_authorities":true,"managerial_authorities":true}'::jsonb,
  function_activities text NOT NULL DEFAULT '',
  technical_authorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  managerial_authorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_general_knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_technical_knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  technical_knowledge_other text NOT NULL DEFAULT '',
  selected_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_qualifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  qualification_other text NOT NULL DEFAULT '',
  selected_experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  conclusive_opinion_approved boolean,
  conclusive_opinion_text text NOT NULL DEFAULT '',
  analysis_approval_responsible_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  analysis_approval_responsible_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  document_code text NOT NULL DEFAULT 'PR-6.2F',
  document_reference text NOT NULL DEFAULT 'PR-6.2',
  document_revision text NOT NULL DEFAULT '00',
  document_model_issue_date date NOT NULL DEFAULT '2025-06-30',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personnel_selections_tenant ON public.personnel_selections (tenant_id);

CREATE TABLE IF NOT EXISTS public.personnel_attendance_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  course_title text NOT NULL DEFAULT '',
  schedule text NOT NULL DEFAULT '',
  executing_entity text NOT NULL DEFAULT '',
  course_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_hours text NOT NULL DEFAULT '',
  instructors text NOT NULL DEFAULT '',
  content_summary text NOT NULL DEFAULT '',
  observations text NOT NULL DEFAULT '',
  concludes_count integer NOT NULL DEFAULT 0,
  attendance_percentage numeric(5, 2),
  approved_count integer NOT NULL DEFAULT 0,
  reproved_count integer NOT NULL DEFAULT 0,
  instructor_responsible text NOT NULL DEFAULT '',
  document_code text NOT NULL DEFAULT 'RE-6.2D',
  document_reference text NOT NULL DEFAULT 'PR-6.2',
  document_revision text NOT NULL DEFAULT '00',
  document_model_issue_date date NOT NULL DEFAULT '2025-06-30',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personnel_attendance_lists_tenant ON public.personnel_attendance_lists (tenant_id);

CREATE TABLE IF NOT EXISTS public.personnel_attendance_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_list_id uuid NOT NULL REFERENCES public.personnel_attendance_lists (id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employee_registrations (id) ON DELETE SET NULL,
  employee_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_number integer NOT NULL DEFAULT 1,
  full_name text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  signature_status text NOT NULL DEFAULT '',
  frequency_percentage numeric(5, 2),
  result text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personnel_attendance_participants_list ON public.personnel_attendance_participants (attendance_list_id);

DROP TRIGGER IF EXISTS trg_personnel_exp_eval_touch ON public.personnel_experience_evaluations;
CREATE TRIGGER trg_personnel_exp_eval_touch
  BEFORE UPDATE ON public.personnel_experience_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_personnel_exp_eval_items_touch ON public.personnel_experience_evaluation_items;
CREATE TRIGGER trg_personnel_exp_eval_items_touch
  BEFORE UPDATE ON public.personnel_experience_evaluation_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_personnel_selections_touch ON public.personnel_selections;
CREATE TRIGGER trg_personnel_selections_touch
  BEFORE UPDATE ON public.personnel_selections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_personnel_attendance_lists_touch ON public.personnel_attendance_lists;
CREATE TRIGGER trg_personnel_attendance_lists_touch
  BEFORE UPDATE ON public.personnel_attendance_lists
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_personnel_attendance_participants_touch ON public.personnel_attendance_participants;
CREATE TRIGGER trg_personnel_attendance_participants_touch
  BEFORE UPDATE ON public.personnel_attendance_participants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.personnel_experience_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_experience_evaluation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_attendance_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_attendance_participants ENABLE ROW LEVEL SECURITY;

-- RLS via tenant on parent; items inherit through evaluation join policy

CREATE POLICY "pee_select" ON public.personnel_experience_evaluations FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
CREATE POLICY "pee_insert" ON public.personnel_experience_evaluations FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
CREATE POLICY "pee_update" ON public.personnel_experience_evaluations FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
CREATE POLICY "pee_delete" ON public.personnel_experience_evaluations FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

CREATE POLICY "peei_select" ON public.personnel_experience_evaluation_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.personnel_experience_evaluations e
    WHERE e.id = evaluation_id AND public.cadastro_tenant_access(e.tenant_id)
  ));
CREATE POLICY "peei_insert" ON public.personnel_experience_evaluation_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.personnel_experience_evaluations e
    WHERE e.id = evaluation_id AND public.cadastro_tenant_access(e.tenant_id)
  ));
CREATE POLICY "peei_update" ON public.personnel_experience_evaluation_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.personnel_experience_evaluations e
    WHERE e.id = evaluation_id AND public.cadastro_tenant_access(e.tenant_id)
  ));
CREATE POLICY "peei_delete" ON public.personnel_experience_evaluation_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.personnel_experience_evaluations e
    WHERE e.id = evaluation_id AND public.cadastro_tenant_access(e.tenant_id)
  ));

CREATE POLICY "ps_select" ON public.personnel_selections FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
CREATE POLICY "ps_insert" ON public.personnel_selections FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
CREATE POLICY "ps_update" ON public.personnel_selections FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
CREATE POLICY "ps_delete" ON public.personnel_selections FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

CREATE POLICY "pal_select" ON public.personnel_attendance_lists FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
CREATE POLICY "pal_insert" ON public.personnel_attendance_lists FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
CREATE POLICY "pal_update" ON public.personnel_attendance_lists FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
CREATE POLICY "pal_delete" ON public.personnel_attendance_lists FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

CREATE POLICY "pap_select" ON public.personnel_attendance_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.personnel_attendance_lists l
    WHERE l.id = attendance_list_id AND public.cadastro_tenant_access(l.tenant_id)
  ));
CREATE POLICY "pap_insert" ON public.personnel_attendance_participants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.personnel_attendance_lists l
    WHERE l.id = attendance_list_id AND public.cadastro_tenant_access(l.tenant_id)
  ));
CREATE POLICY "pap_update" ON public.personnel_attendance_participants FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.personnel_attendance_lists l
    WHERE l.id = attendance_list_id AND public.cadastro_tenant_access(l.tenant_id)
  ));
CREATE POLICY "pap_delete" ON public.personnel_attendance_participants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.personnel_attendance_lists l
    WHERE l.id = attendance_list_id AND public.cadastro_tenant_access(l.tenant_id)
  ));
