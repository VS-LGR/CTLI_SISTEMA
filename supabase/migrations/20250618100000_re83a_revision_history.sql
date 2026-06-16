-- Histórico de revisões RE-8.3A e distribuições exemplo (conforme modelo SGQ)

CREATE OR REPLACE FUNCTION public.seed_re83a_revision_history_for_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_id uuid;
  v_rev_count int;
  v_resp_id uuid;
BEGIN
  SELECT id INTO v_doc_id
  FROM public.master_documents
  WHERE tenant_id = p_tenant_id AND code = 'RE-8.3A'
  LIMIT 1;

  IF v_doc_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_rev_count
  FROM public.document_revisions
  WHERE tenant_id = p_tenant_id AND master_document_id = v_doc_id;

  -- Só popula se ainda não houver histórico completo (apenas emissão inicial ou vazio)
  IF v_rev_count > 1 THEN
    RETURN;
  END IF;

  SELECT id INTO v_resp_id
  FROM public.responsibles
  WHERE tenant_id = p_tenant_id
    AND name ILIKE '%Guilherme Rodrigues%'
  LIMIT 1;

  DELETE FROM public.document_revisions
  WHERE tenant_id = p_tenant_id AND master_document_id = v_doc_id;

  INSERT INTO public.document_revisions (
    tenant_id, master_document_id, revision_number, issue_date, revision_date,
    change_description, status, approved_by_id, changed_by_id, notes
  ) VALUES
    (
      p_tenant_id, v_doc_id, '00', '2025-06-30', '2025-06-30',
      'Edição Inicial: Procedimentos e registros da qualidade e consulta as normas e legislações',
      'obsoleta', v_resp_id, v_resp_id,
      CASE WHEN v_resp_id IS NULL THEN 'Guilherme Rodrigues' ELSE '' END
    ),
    (
      p_tenant_id, v_doc_id, '01', '2025-07-07', '2025-07-07',
      'Procedimentos e registros Técnicos',
      'obsoleta', v_resp_id, v_resp_id,
      CASE WHEN v_resp_id IS NULL THEN 'Guilherme Rodrigues' ELSE '' END
    ),
    (
      p_tenant_id, v_doc_id, '02', '2025-12-22', '2025-12-22',
      'Consulta as normas e legislações',
      'obsoleta', v_resp_id, v_resp_id,
      CASE WHEN v_resp_id IS NULL THEN 'Guilherme Rodrigues' ELSE '' END
    ),
    (
      p_tenant_id, v_doc_id, '03', '2026-06-01', '2026-06-01',
      'Consulta as normas e legislações',
      'vigente', v_resp_id, v_resp_id,
      CASE WHEN v_resp_id IS NULL THEN 'Guilherme Rodrigues' ELSE '' END
    );

  UPDATE public.master_documents
  SET
    current_revision = '03',
    current_issue_date = '2026-06-01',
    current_revision_date = '2026-06-01',
    previous_revision_date = '2025-12-22',
    emission_responsible_id = COALESCE(emission_responsible_id, v_resp_id),
    approval_responsible_id = COALESCE(approval_responsible_id, v_resp_id),
    updated_at = now()
  WHERE id = v_doc_id;

  -- Distribuição da RE-8.3A (Qualidade Original)
  IF NOT EXISTS (
    SELECT 1 FROM public.document_distributions
    WHERE tenant_id = p_tenant_id AND master_document_id = v_doc_id
  ) THEN
    INSERT INTO public.document_distributions (
      tenant_id, master_document_id, area, copy_number, copy_type, distribution_method, distribution_date, status
    ) VALUES
      (p_tenant_id, v_doc_id, 'Qualidade', 0, 'original', 'Eletrônico', '2026-06-01', 'ativa');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_procedure_distributions_for_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_area text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.document_distributions WHERE tenant_id = p_tenant_id LIMIT 1
  ) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT id, code FROM public.master_documents
    WHERE tenant_id = p_tenant_id AND type = 'procedimento' AND status = 'ativo'
  LOOP
    v_area := CASE
      WHEN r.code IN ('PR-4.100', 'PR-6.200', 'PR-6.600', 'PR-7.100', 'PR-7.1.700', 'PR-7.900', 'PR-7.1000',
        'PR-8.300', 'PR-8.400', 'PR-8.6.200', 'PR-8.700', 'PR-8.800', 'PR-8.900') THEN 'Gerente da Qualidade'
      WHEN r.code IN ('PR-6.400', 'PR-6.4.1000', 'PR-6.4.1200', 'PR-6.500', 'PR-7.200', 'PR-7.2.200',
        'PR-7.400', 'PR-7.600', 'PR-7.700', 'PR-7.800', 'PR-7.1100') THEN 'Gerente Técnico'
      WHEN r.code = 'PR-6.600' THEN 'Compras e Vendas'
      ELSE 'Gerente da Qualidade'
    END;

    INSERT INTO public.document_distributions (
      tenant_id, master_document_id, area, copy_type, distribution_method, distribution_date, status
    ) VALUES (
      p_tenant_id, r.id, v_area, 'copia_eletronica', 'Eletrônico', '2025-06-30', 'ativa'
    );
  END LOOP;

  -- Manual e política
  FOR r IN
    SELECT id, code FROM public.master_documents
    WHERE tenant_id = p_tenant_id
      AND type IN ('manual', 'politica', 'documento_interno')
      AND status = 'ativo'
  LOOP
    INSERT INTO public.document_distributions (
      tenant_id, master_document_id, area, copy_type, distribution_method, distribution_date, status
    ) VALUES (
      p_tenant_id, r.id,
      CASE WHEN r.code LIKE 'MQ%' THEN 'Gerente da Qualidade' ELSE 'Gerente da Qualidade, Diretor' END,
      'copia_eletronica', 'Eletrônico', '2025-06-30', 'ativa'
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.tenants
  LOOP
    PERFORM public.seed_re83a_revision_history_for_tenant(r.id);
    PERFORM public.seed_procedure_distributions_for_tenant(r.id);
  END LOOP;
END $$;
