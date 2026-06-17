-- RE-7.2B — data de validade do certificado (editável, padrão +1 ano na importação)

ALTER TABLE public.calibration_certificates
  ADD COLUMN IF NOT EXISTS validity_date date;
