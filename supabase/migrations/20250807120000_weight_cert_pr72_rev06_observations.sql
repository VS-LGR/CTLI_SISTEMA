-- Alinha observações RE-5.4.2B ao PR-7.2 Rev.06 (Calibração de Pesos / 17025:2017)
-- e default de ciclos ABA (§8.1.1 = 5) em novos itens de certificado.

ALTER TABLE public.weight_calibration_certificate_items
  ALTER COLUMN cycle_count SET DEFAULT 5;

CREATE OR REPLACE FUNCTION public.weight_certificate_observations_pr72_rev06()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'certificateObservations',
    jsonb_build_object(
      'rbc', jsonb_build_array(
        'O ajuste ou recuperação dos pesos, quando for realizado, não pertence ao escopo de acreditação do laboratório.',
        'Os resultados apresentados referem-se exclusivamente ao instrumento acima caracterizado, não sendo extensivos a quaisquer lotes. Uma cópia deste certificado será arquivada por cinco anos.',
        'A calibração foi realizada pelo método de comparação direta (ABA), conforme procedimento interno PR-7.2 Calibração de Pesos.',
        'Este Certificado de Calibração atende aos requisitos da NBR ISO/IEC 17025:2017.',
        'A calibração foi realizada utilizando peso padrão de referência rastreáveis ao Sistema Internacional de Unidades.',
        'A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.',
        'Este certificado só poderá ser utilizado para fins publicitários e/ou promocionais quando autorizado pelo laboratório.',
        'Esta calibração não isenta o instrumento de controle metrológico estabelecido na regulamentação metrológica.',
        'A calibração foi realizada nas dependências do laboratório.'
      ),
      'rastreavel', jsonb_build_array(
        'O ajuste ou recuperação dos pesos, quando for realizado, não pertence ao escopo de acreditação do laboratório.',
        'Os resultados apresentados referem-se exclusivamente ao instrumento acima caracterizado, não sendo extensivos a quaisquer lotes. Uma cópia deste certificado será arquivada por cinco anos.',
        'A calibração foi realizada pelo método de comparação direta (ABA), conforme procedimento interno PR-7.2 Calibração de Pesos.',
        'A calibração foi realizada utilizando peso padrão de referência rastreáveis ao Sistema Internacional de Unidades.',
        'A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.',
        'Este certificado só poderá ser utilizado para fins publicitários e/ou promocionais quando autorizado pelo laboratório.',
        'Esta calibração não isenta o instrumento de controle metrológico estabelecido na regulamentação metrológica.',
        'A calibração foi realizada nas dependências do laboratório.'
      )
    )
  );
$$;

UPDATE public.master_documents md
SET
  export_template_config = public.weight_certificate_observations_pr72_rev06(),
  updated_at = now()
WHERE md.code = 'RE-5.4.2B';

-- Mantém seed de novos tenants alinhado (função criada em 20250709000000)
CREATE OR REPLACE FUNCTION public.ensure_weight_calibration_master_documents(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.master_documents (
    tenant_id, code, title, type, category, reference, current_revision,
    current_issue_date, current_revision_date, status, file_naming_rule,
    export_file_name_pattern, template_key, linked_module, export_template_config
  )
  SELECT
    p_tenant_id,
    'RE-5.4.2A',
    'Coleta de Dados — Calibração de Pesos-Padrão',
    'registro', 'Calibração', 'PR-7.2', '00',
    CURRENT_DATE, CURRENT_DATE, 'ativo',
    'Código + Título + Revisão + Cliente e Data',
    '{codigo}_{titulo}_Rev{revisao}_{cliente}_{data}',
    're-542a-coleta-peso-padrao-pdf', 'PR-7.2', '{}'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM public.master_documents md
    WHERE md.tenant_id = p_tenant_id AND md.code = 'RE-5.4.2A'
  );

  INSERT INTO public.master_documents (
    tenant_id, code, title, type, category, reference, current_revision,
    current_issue_date, current_revision_date, status, file_naming_rule,
    export_file_name_pattern, template_key, linked_module, export_template_config
  )
  SELECT
    p_tenant_id,
    'RE-5.4.2B',
    'Certificado de Calibração de Pesos',
    'registro', 'Calibração', 'PR-7.2', '03',
    CURRENT_DATE, CURRENT_DATE, 'ativo',
    'Código + Título + Revisão + Número, Cliente e Identificação',
    '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{numeroSerie}',
    're-542b-certificado-peso-padrao-pdf', 'PR-7.2',
    public.weight_certificate_observations_pr72_rev06()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.master_documents md
    WHERE md.tenant_id = p_tenant_id AND md.code = 'RE-5.4.2B'
  );

  INSERT INTO public.document_template_links (tenant_id, master_document_id, template_key, module_name, is_default, is_active)
  SELECT md.tenant_id, md.id, md.template_key, 'PR-7.2', true, true
  FROM public.master_documents md
  WHERE md.tenant_id = p_tenant_id
    AND md.code IN ('RE-5.4.2A', 'RE-5.4.2B')
    AND md.template_key IS NOT NULL
    AND md.template_key <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.document_template_links dtl
      WHERE dtl.master_document_id = md.id AND dtl.template_key = md.template_key
    );
END;
$$;
