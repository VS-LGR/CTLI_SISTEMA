-- Proposta RE-7.1A: unidade de massa e pontos solicitados pelo cliente

ALTER TABLE public.commercial_proposal_scales
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'g',
  ADD COLUMN IF NOT EXISTS client_requested_points text NOT NULL DEFAULT '';

ALTER TABLE public.commercial_proposal_calibration_points
  ADD COLUMN IF NOT EXISTS nominal_unit text NOT NULL DEFAULT 'g';
