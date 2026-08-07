-- Proposta: itens de pesos-padrão + FKs na coleta de pesos (RE-5.4.2A)

CREATE TABLE IF NOT EXISTS public.commercial_proposal_weight_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.commercial_proposals (id) ON DELETE CASCADE,
  item_number integer NOT NULL DEFAULT 1,
  identification text NOT NULL DEFAULT '',
  nominal_value text NOT NULL DEFAULT '',
  nominal_unit text NOT NULL DEFAULT 'g',
  uut_class text NOT NULL DEFAULT '',
  uut_material text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '',
  serial_number text NOT NULL DEFAULT '',
  unit_value numeric(14, 2) NOT NULL DEFAULT 0,
  standard_weight_item_id uuid REFERENCES public.standard_weight_items (id) ON DELETE SET NULL,
  collection_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_cp_weight_items_proposal
  ON public.commercial_proposal_weight_items (proposal_id);

CREATE INDEX IF NOT EXISTS idx_cp_weight_items_standard
  ON public.commercial_proposal_weight_items (standard_weight_item_id)
  WHERE standard_weight_item_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_commercial_proposal_weight_items_touch ON public.commercial_proposal_weight_items;
CREATE TRIGGER trg_commercial_proposal_weight_items_touch
  BEFORE UPDATE ON public.commercial_proposal_weight_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_commercial_proposal_updated();

ALTER TABLE public.commercial_proposal_weight_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpwi_select" ON public.commercial_proposal_weight_items;
CREATE POLICY "cpwi_select" ON public.commercial_proposal_weight_items FOR SELECT
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)));
DROP POLICY IF EXISTS "cpwi_insert" ON public.commercial_proposal_weight_items;
CREATE POLICY "cpwi_insert" ON public.commercial_proposal_weight_items FOR INSERT
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)));
DROP POLICY IF EXISTS "cpwi_update" ON public.commercial_proposal_weight_items;
CREATE POLICY "cpwi_update" ON public.commercial_proposal_weight_items FOR UPDATE
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)))
  WITH CHECK (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)));
DROP POLICY IF EXISTS "cpwi_delete" ON public.commercial_proposal_weight_items;
CREATE POLICY "cpwi_delete" ON public.commercial_proposal_weight_items FOR DELETE
  USING (public.cadastro_tenant_access(public.commercial_proposal_tenant_from_child(proposal_id)));

ALTER TABLE public.weight_calibration_collections
  ADD COLUMN IF NOT EXISTS commercial_proposal_id uuid REFERENCES public.commercial_proposals (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commercial_proposal_weight_item_id uuid REFERENCES public.commercial_proposal_weight_items (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_weight_cal_coll_proposal
  ON public.weight_calibration_collections (commercial_proposal_id);

CREATE INDEX IF NOT EXISTS idx_weight_cal_coll_proposal_item
  ON public.weight_calibration_collections (commercial_proposal_weight_item_id)
  WHERE commercial_proposal_weight_item_id IS NOT NULL;

ALTER TABLE public.commercial_proposal_weight_items
  DROP CONSTRAINT IF EXISTS commercial_proposal_weight_items_collection_id_fkey;
ALTER TABLE public.commercial_proposal_weight_items
  ADD CONSTRAINT commercial_proposal_weight_items_collection_id_fkey
  FOREIGN KEY (collection_id) REFERENCES public.weight_calibration_collections (id) ON DELETE SET NULL;
