-- Material e classe OIML no cadastro de pesos padrão (PR-6.4) — usados na calibração RE-5.4.2

ALTER TABLE public.standard_weight_items
  ADD COLUMN IF NOT EXISTS material text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS weight_class text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.standard_weight_items.material IS 'Material de construção (Inox, Alumínio, …) para empuxo/densidade';
COMMENT ON COLUMN public.standard_weight_items.weight_class IS 'Classe OIML / Portaria 289 (E1, F1, M1, …)';
