-- Lembretes da dashboard por tenant (substitui API legada /dashboard/reminders)

CREATE TABLE IF NOT EXISTS public.dashboard_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  text text NOT NULL,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_reminders_tenant_created
  ON public.dashboard_reminders (tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.dashboard_reminder_manage(tid uuid)
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
          WHERE p.id = auth.uid() AND p.role = 'client'
        )
      )
    );
$$;

ALTER TABLE public.dashboard_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_reminders_select" ON public.dashboard_reminders;
CREATE POLICY "dashboard_reminders_select" ON public.dashboard_reminders
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR tenant_id = public.my_tenant_id()
  );

DROP POLICY IF EXISTS "dashboard_reminders_insert" ON public.dashboard_reminders;
CREATE POLICY "dashboard_reminders_insert" ON public.dashboard_reminders
  FOR INSERT TO authenticated
  WITH CHECK (public.dashboard_reminder_manage(tenant_id));

DROP POLICY IF EXISTS "dashboard_reminders_delete" ON public.dashboard_reminders;
CREATE POLICY "dashboard_reminders_delete" ON public.dashboard_reminders
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR created_by = auth.uid()
  );
