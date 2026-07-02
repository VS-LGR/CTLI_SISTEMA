-- Observações do certificado RE-7.2B controladas pela Lista Mestra (por tenant/ambiente).

ALTER TABLE master_documents
  ADD COLUMN IF NOT EXISTS export_template_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN master_documents.export_template_config IS
  'Configuração de exportação PDF (ex.: certificateObservations para RE-7.2B).';

UPDATE master_documents
SET export_template_config = jsonb_build_object(
  'certificateObservations',
  jsonb_build_object(
    'rbc',
    jsonb_build_array(
      'A calibração foi realizada nas instalações do Cliente. Este certificado é válido apenas para a balança calibrada. Uma cópia deste certificado será arquivada por cinco anos.',
      'Este certificado só poderá ser usado para fins publicitários e/ou promocionais quando autorizado pela CTLI.',
      'A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.',
      'A calibração foi realizada utilizando peso padrão de propriedade da CTLI rastreáveis ao Sistema Internacional de Unidades.',
      'Este Certificado de Calibração atende aos requisitos da NBR ISO/IEC 17025:2017.',
      'A calibração foi realizada pelo método de comparação direta, conforme procedimento interno PR-7.2 Calibração de Balanças.',
      'Esta calibração não isenta a balança do controle estabelecido da Regulamentação Metrológica.'
    ),
    'rastreavel',
    jsonb_build_array(
      'A calibração foi realizada nas instalações do Cliente. Este certificado é válido apenas para a balança calibrada. Uma cópia deste certificado será arquivada por cinco anos.',
      'Este certificado só poderá ser usado para fins publicitários e/ou promocionais quando autorizado pela CTLI.',
      'A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.',
      'A calibração foi realizada utilizando peso padrão rastreáveis ao Sistema Internacional de Unidades.',
      'Este certificado é emitido por laboratório credenciado pelo IPEM-MG para calibração rastreável a padrões nacionais/internacionais.',
      'A calibração foi realizada pelo método de comparação direta, conforme procedimento interno PR-7.2 Calibração de Balanças.',
      'Esta calibração não isenta a balança do controle estabelecido da Regulamentação Metrológica.'
    )
  )
)
WHERE code = 'RE-7.2B'
  AND (export_template_config IS NULL OR export_template_config = '{}'::jsonb);
