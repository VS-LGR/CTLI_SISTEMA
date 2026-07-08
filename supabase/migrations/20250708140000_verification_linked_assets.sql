-- Vincular computadores/veículos à verificação RE-6.4.12B (cadastro inline na verificação)

ALTER TABLE public.equipment_computers
  ADD COLUMN IF NOT EXISTS verification_id uuid
    REFERENCES public.equipment_verifications (id) ON DELETE CASCADE;

ALTER TABLE public.equipment_vehicles
  ADD COLUMN IF NOT EXISTS verification_id uuid
    REFERENCES public.equipment_verifications (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_equipment_computers_verification
  ON public.equipment_computers (verification_id);

CREATE INDEX IF NOT EXISTS idx_equipment_vehicles_verification
  ON public.equipment_vehicles (verification_id);
