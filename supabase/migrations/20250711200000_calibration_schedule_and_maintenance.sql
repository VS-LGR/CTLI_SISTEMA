-- RE-6.4A Cronograma de Calibração + RE-6.4.12A Programa de Manutenção

CREATE TABLE IF NOT EXISTS public.calibration_schedule_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('peso', 'thermo')),
  source_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  mark_kind text NOT NULL CHECK (mark_kind IN ('previsto', 'realizado')),
  marked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calibration_schedule_overrides_unique
    UNIQUE (tenant_id, source, source_id, year, month, mark_kind)
);

CREATE INDEX IF NOT EXISTS idx_calib_sched_tenant_year
  ON public.calibration_schedule_overrides (tenant_id, year);

DROP TRIGGER IF EXISTS trg_calib_sched_touch ON public.calibration_schedule_overrides;
CREATE TRIGGER trg_calib_sched_touch
  BEFORE UPDATE ON public.calibration_schedule_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.calibration_schedule_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calib_sched_select" ON public.calibration_schedule_overrides;
CREATE POLICY "calib_sched_select" ON public.calibration_schedule_overrides FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "calib_sched_insert" ON public.calibration_schedule_overrides;
CREATE POLICY "calib_sched_insert" ON public.calibration_schedule_overrides FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "calib_sched_update" ON public.calibration_schedule_overrides;
CREATE POLICY "calib_sched_update" ON public.calibration_schedule_overrides FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "calib_sched_delete" ON public.calibration_schedule_overrides;
CREATE POLICY "calib_sched_delete" ON public.calibration_schedule_overrides FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

CREATE TABLE IF NOT EXISTS public.equipment_maintenance_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  year integer NOT NULL,
  equipment_kind text NOT NULL
    CHECK (equipment_kind IN ('pesos', 'thermo', 'computador', 'veiculo')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipment_maintenance_programs_unique UNIQUE (tenant_id, year, equipment_kind)
);

CREATE INDEX IF NOT EXISTS idx_maint_prog_tenant
  ON public.equipment_maintenance_programs (tenant_id, year DESC);

DROP TRIGGER IF EXISTS trg_maint_prog_touch ON public.equipment_maintenance_programs;
CREATE TRIGGER trg_maint_prog_touch
  BEFORE UPDATE ON public.equipment_maintenance_programs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.equipment_maintenance_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maint_prog_select" ON public.equipment_maintenance_programs;
CREATE POLICY "maint_prog_select" ON public.equipment_maintenance_programs FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "maint_prog_insert" ON public.equipment_maintenance_programs;
CREATE POLICY "maint_prog_insert" ON public.equipment_maintenance_programs FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "maint_prog_update" ON public.equipment_maintenance_programs;
CREATE POLICY "maint_prog_update" ON public.equipment_maintenance_programs FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "maint_prog_delete" ON public.equipment_maintenance_programs;
CREATE POLICY "maint_prog_delete" ON public.equipment_maintenance_programs FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));

CREATE TABLE IF NOT EXISTS public.equipment_maintenance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.equipment_maintenance_programs (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  asset_label text NOT NULL DEFAULT '',
  quarter integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  frequency text NOT NULL DEFAULT 'trimestral',
  status text NOT NULL DEFAULT 'planejado'
    CHECK (status IN ('planejado', 'executado')),
  planned_date date,
  executed_date date,
  responsible text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_events_program
  ON public.equipment_maintenance_events (program_id, quarter);

DROP TRIGGER IF EXISTS trg_maint_events_touch ON public.equipment_maintenance_events;
CREATE TRIGGER trg_maint_events_touch
  BEFORE UPDATE ON public.equipment_maintenance_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.equipment_maintenance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maint_events_select" ON public.equipment_maintenance_events;
CREATE POLICY "maint_events_select" ON public.equipment_maintenance_events FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "maint_events_insert" ON public.equipment_maintenance_events;
CREATE POLICY "maint_events_insert" ON public.equipment_maintenance_events FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "maint_events_update" ON public.equipment_maintenance_events;
CREATE POLICY "maint_events_update" ON public.equipment_maintenance_events FOR UPDATE
  USING (public.cadastro_tenant_access(tenant_id))
  WITH CHECK (public.cadastro_tenant_access(tenant_id));
DROP POLICY IF EXISTS "maint_events_delete" ON public.equipment_maintenance_events;
CREATE POLICY "maint_events_delete" ON public.equipment_maintenance_events FOR DELETE
  USING (public.cadastro_tenant_access(tenant_id));
