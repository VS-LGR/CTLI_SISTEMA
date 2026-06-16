-- Correção de códigos documentais conforme Lista Mestra real

-- Pedido de Compra: RE-6.6D (não RE-6.6E nem RE-6.6B)
ALTER TABLE public.purchase_orders
  ALTER COLUMN document_code SET DEFAULT 'RE-6.6D';

UPDATE public.purchase_orders
SET document_code = 'RE-6.6D'
WHERE document_code IN ('RE-6.6E', 'RE-6.6B');

-- Seleção de Pessoal: RE-6.2F (não PR-6.2F)
ALTER TABLE public.personnel_selections
  ALTER COLUMN document_code SET DEFAULT 'RE-6.2F';

UPDATE public.personnel_selections
SET document_code = 'RE-6.2F'
WHERE document_code = 'PR-6.2F';

-- Vínculo opcional tenant_documents → master_documents
ALTER TABLE public.tenant_documents
  ADD COLUMN IF NOT EXISTS master_document_id uuid REFERENCES public.master_documents (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_documents_master ON public.tenant_documents (master_document_id);
