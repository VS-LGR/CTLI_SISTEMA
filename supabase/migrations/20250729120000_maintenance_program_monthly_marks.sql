-- RE-6.4.12A: marcações mensais (x=planejado, y=executado) alinhadas ao Excel

ALTER TABLE public.equipment_maintenance_events
  ADD COLUMN IF NOT EXISTS month integer;

-- Trimestres antigos → meses típicos do ciclo Excel (Fev / Jun / Out / Dez)
UPDATE public.equipment_maintenance_events
SET month = CASE quarter
  WHEN 1 THEN 2
  WHEN 2 THEN 6
  WHEN 3 THEN 10
  ELSE 12
END
WHERE month IS NULL;

ALTER TABLE public.equipment_maintenance_events
  ALTER COLUMN month SET DEFAULT 1;

UPDATE public.equipment_maintenance_events SET month = 1 WHERE month IS NULL;

ALTER TABLE public.equipment_maintenance_events
  ALTER COLUMN month SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipment_maintenance_events_month_check'
  ) THEN
    ALTER TABLE public.equipment_maintenance_events
      ADD CONSTRAINT equipment_maintenance_events_month_check
      CHECK (month BETWEEN 1 AND 12);
  END IF;
END $$;

-- Remove duplicados (mantém o mais recente) antes do índice único
DELETE FROM public.equipment_maintenance_events e
USING public.equipment_maintenance_events d
WHERE e.program_id = d.program_id
  AND e.asset_label = d.asset_label
  AND e.month = d.month
  AND e.id < d.id;

CREATE UNIQUE INDEX IF NOT EXISTS equipment_maintenance_events_unique_mark
  ON public.equipment_maintenance_events (program_id, asset_label, month);

ALTER TABLE public.equipment_maintenance_programs
  ADD COLUMN IF NOT EXISTS issued_approved_by text NOT NULL DEFAULT '';
