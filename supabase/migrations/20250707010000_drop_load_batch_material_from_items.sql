-- Remove material do lote do cadastro (definido no ponto, como peso padrão)

ALTER TABLE public.standard_weight_items
  DROP COLUMN IF EXISTS load_batch_material_preset;
