-- Envio de certificados por e-mail + papel signatário

ALTER TABLE public.employee_registrations
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS certificate_email_from_name text NOT NULL DEFAULT '';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_registration_id uuid
  REFERENCES public.employee_registrations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_employee_registration
  ON public.profiles (employee_registration_id)
  WHERE employee_registration_id IS NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'diretor',
    'gerente_qualidade',
    'gerente_tecnico',
    'administrativo_vendas',
    'client',
    'tecnico_campo',
    'signatario'
  ));

ALTER TABLE public.calibration_certificates
  ADD COLUMN IF NOT EXISTS client_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_email_sent_to text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_email_sent_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.calibration_certificates DROP CONSTRAINT IF EXISTS calibration_certificates_status_check;
ALTER TABLE public.calibration_certificates ADD CONSTRAINT calibration_certificates_status_check
  CHECK (status IN (
    'rascunho', 'calculado', 'em_revisao_tecnica', 'aguardando_aprovacao',
    'aprovado', 'emitido', 'enviado', 'substituido', 'cancelado', 'reprovado', 'obsoleto'
  ));

CREATE INDEX IF NOT EXISTS idx_cal_cert_pending_approval
  ON public.calibration_certificates (tenant_id, updated_at DESC)
  WHERE status = 'aguardando_aprovacao';

CREATE INDEX IF NOT EXISTS idx_cal_cert_not_emailed
  ON public.calibration_certificates (tenant_id, updated_at DESC)
  WHERE status IN ('aprovado', 'emitido') AND client_email_sent_at IS NULL;

CREATE TABLE IF NOT EXISTS public.certificate_email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.calibration_certificates (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  recipient text NOT NULL DEFAULT '',
  resend_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message text NOT NULL DEFAULT '',
  sent_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_email_deliveries_cert
  ON public.certificate_email_deliveries (certificate_id, sent_at DESC);

ALTER TABLE public.certificate_email_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cert_email_deliveries_select" ON public.certificate_email_deliveries;
CREATE POLICY "cert_email_deliveries_select" ON public.certificate_email_deliveries FOR SELECT
  USING (public.cadastro_tenant_access(tenant_id));

DROP POLICY IF EXISTS "cert_email_deliveries_insert" ON public.certificate_email_deliveries;
CREATE POLICY "cert_email_deliveries_insert" ON public.certificate_email_deliveries FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(tenant_id));

-- Aprovação em lote
CREATE OR REPLACE FUNCTION public.approve_calibration_certificates(
  p_certificate_ids uuid[],
  p_user_id uuid,
  p_notes text DEFAULT ''
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_cert record;
BEGIN
  FOR v_cert IN
    SELECT c.id, c.tenant_id, c.signatory_id, c.signatory_name
    FROM public.calibration_certificates c
    WHERE c.id = ANY (p_certificate_ids)
      AND c.status = 'aguardando_aprovacao'
      AND public.cadastro_tenant_access(c.tenant_id)
  LOOP
    UPDATE public.calibration_certificates
    SET
      status = 'aprovado',
      approval_date = COALESCE(approval_date, CURRENT_DATE),
      approval_notes = COALESCE(NULLIF(TRIM(p_notes), ''), approval_notes),
      updated_by = p_user_id,
      updated_at = now()
    WHERE id = v_cert.id;

    INSERT INTO public.calibration_certificate_reviews (
      certificate_id, review_type, notes, reviewed_by, employee_id
    ) VALUES (
      v_cert.id, 'aprovacao', COALESCE(p_notes, ''), p_user_id, v_cert.signatory_id
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
