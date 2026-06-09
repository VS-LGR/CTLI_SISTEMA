-- Vínculo colaborador → seleção de origem (PR-6.2F)

ALTER TABLE public.employee_registrations
  ADD COLUMN IF NOT EXISTS source_selection_id uuid
  REFERENCES public.personnel_selections (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employee_source_selection
  ON public.employee_registrations (tenant_id, source_selection_id)
  WHERE source_selection_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_source_selection_unique
  ON public.employee_registrations (source_selection_id)
  WHERE source_selection_id IS NOT NULL;
