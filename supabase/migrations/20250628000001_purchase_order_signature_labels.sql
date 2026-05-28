-- Rótulos editáveis para assinaturas do pedido de compra

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS signature_slot_1_label text NOT NULL DEFAULT 'Gerente Técnico',
  ADD COLUMN IF NOT EXISTS signature_slot_2_label text NOT NULL DEFAULT 'Compras';
