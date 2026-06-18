-- Incluir status 'obsoleto' na constraint de calibration_certificates

ALTER TABLE public.calibration_certificates
  DROP CONSTRAINT IF EXISTS calibration_certificates_status_check;

ALTER TABLE public.calibration_certificates
  ADD CONSTRAINT calibration_certificates_status_check
  CHECK (status IN (
    'rascunho', 'calculado', 'em_revisao_tecnica', 'aguardando_aprovacao',
    'aprovado', 'emitido', 'substituido', 'cancelado', 'reprovado', 'obsoleto'
  ));
