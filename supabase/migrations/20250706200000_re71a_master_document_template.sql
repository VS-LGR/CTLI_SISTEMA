-- RE-7.1A: vincular template PDF e links da Lista Mestra (tenants existentes)

UPDATE public.master_documents
SET template_key = 're-71a-proposta-comercial-pdf'
WHERE code = 'RE-7.1A'
  AND (template_key IS NULL OR template_key = '');

INSERT INTO public.document_template_links (
  tenant_id, master_document_id, template_key, module_name, is_default, is_active
)
SELECT
  md.tenant_id,
  md.id,
  're-71a-proposta-comercial-pdf',
  COALESCE(NULLIF(md.linked_module, ''), 'PR-7.1'),
  true,
  true
FROM public.master_documents md
WHERE md.code = 'RE-7.1A'
  AND NOT EXISTS (
    SELECT 1
    FROM public.document_template_links dtl
    WHERE dtl.tenant_id = md.tenant_id
      AND dtl.template_key = 're-71a-proposta-comercial-pdf'
  );
