-- Seed da Lista Mestra por tenant

CREATE OR REPLACE FUNCTION public.seed_master_documents_for_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.master_documents WHERE tenant_id = p_tenant_id LIMIT 1
  ) INTO v_exists;

  IF v_exists THEN
    RETURN;
  END IF;

  -- Manuais, políticas e procedimentos
  INSERT INTO public.master_documents (
    tenant_id, code, title, type, category, reference, current_revision,
    current_issue_date, current_revision_date, status, file_naming_rule,
    export_file_name_pattern, linked_module
  ) VALUES
    (p_tenant_id, 'MQ.000', 'Manual da Qualidade ISO/IEC 17025:2017 – Opção A', 'manual', 'Sistema de Gestão', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', ''),
    (p_tenant_id, '', 'Política da Qualidade', 'politica', 'Sistema de Gestão', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{titulo}_Rev{revisao}_{dataRevisaoAtual}', ''),
    (p_tenant_id, '', 'Estrutura Organizacional', 'documento_interno', 'Sistema de Gestão', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{titulo}_Rev{revisao}_{dataRevisaoAtual}', ''),
    (p_tenant_id, 'PR-4.1', 'Confidencialidade e Imparcialidade', 'procedimento', 'Sistema de Gestão', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-4.1'),
    (p_tenant_id, 'PR-6.2', 'Pessoal', 'procedimento', 'Pessoal', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-6.2'),
    (p_tenant_id, 'PR-6.4', 'Equipamentos', 'procedimento', 'Equipamentos', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-6.4'),
    (p_tenant_id, 'PR-6.4.10', 'Checagens Intermediárias', 'procedimento', 'Equipamentos', 'PR-6.4', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-6.4.10'),
    (p_tenant_id, 'PR-6.4.12', 'Manutenção de Equipamentos', 'procedimento', 'Equipamentos', 'PR-6.4', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-6.4.12'),
    (p_tenant_id, 'PR-6.5', 'Rastreabilidade Metrológica', 'procedimento', 'Calibração', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-6.5'),
    (p_tenant_id, 'PR-6.6', 'Produtos e Serviços Providos Externamente', 'procedimento', 'Compras', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-6.6'),
    (p_tenant_id, 'PR-7.1', 'Análise Crítica de Pedidos, Propostas e Contratos', 'procedimento', 'Comercial', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.1'),
    (p_tenant_id, 'PR-7.1.7', 'Atendimento ao Cliente', 'procedimento', 'Comercial', 'PR-7.1', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.1.7'),
    (p_tenant_id, 'PR-7.2', 'Calibração de Balanças', 'procedimento', 'Calibração', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.2'),
    (p_tenant_id, 'PR-7.2.2', 'Validação do Métodos', 'procedimento', 'Técnico', 'PR-7.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.2.2'),
    (p_tenant_id, 'PR-7.4', 'Manuseio de itens de Calibração', 'procedimento', 'Calibração', 'PR-7.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.4'),
    (p_tenant_id, 'PR-7.6', 'Avaliação da Incerteza de Medição', 'procedimento', 'Técnico', 'PR-7.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.6'),
    (p_tenant_id, 'PR-7.7', 'Garantia da Validade dos Resultados', 'procedimento', 'Técnico', 'PR-7.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.7'),
    (p_tenant_id, 'PR-7.8', 'Relato de Resultados', 'procedimento', 'Técnico', 'PR-7.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.8'),
    (p_tenant_id, 'PR-7.9', 'Reclamações', 'procedimento', 'Comercial', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.9'),
    (p_tenant_id, 'PR-7.10', 'Trabalho Não-Conforme', 'procedimento', 'Técnico', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.10'),
    (p_tenant_id, 'PR-7.11', 'Controle de Dados e Gestão da Informação', 'procedimento', 'Técnico', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-7.11'),
    (p_tenant_id, 'PR-8.3', 'Emissão e Controle de Documentos', 'procedimento', 'Sistema de Gestão', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-8.3'),
    (p_tenant_id, 'PR-8.4', 'Controle de Registros', 'procedimento', 'Registros', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-8.4'),
    (p_tenant_id, 'PR-8.6.2', 'Monitoramento da Satisfação dos Clientes', 'procedimento', 'Comercial', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-8.6.2'),
    (p_tenant_id, 'PR-8.7', 'Ações Corretivas', 'procedimento', 'Sistema de Gestão', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-8.7'),
    (p_tenant_id, 'PR-8.8', 'Auditorias Internas', 'procedimento', 'Auditoria', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-8.8'),
    (p_tenant_id, 'PR-8.9', 'Análise Crítica pela Gerência', 'procedimento', 'Análise Crítica', '', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Data da Revisão Atual', '{codigo}_{titulo}_Rev{revisao}_{dataRevisaoAtual}', 'PR-8.9');

  -- Registros da qualidade
  INSERT INTO public.master_documents (
    tenant_id, code, title, type, category, reference, current_revision,
    current_issue_date, current_revision_date, status, file_naming_rule,
    export_file_name_pattern, template_key, linked_module
  ) VALUES
    (p_tenant_id, 'RE-4.1A', 'Termo de confidencialidade e imparcialidade', 'registro', 'Sistema de Gestão', 'PR-4.1', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Nome e Cargo', '{codigo}_{titulo}_Rev{revisao}_{nome}_{cargo}', '', 'PR-4.1'),
    (p_tenant_id, 'RE-6.2A', 'Adequação de Competência', 'registro', 'Pessoal', 'PR-6.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Nome e Cargo', '{codigo}_{titulo}_Rev{revisao}_{nome}_{cargo}', 're-62a-adequacao-competencia-pdf', 'PR-6.2'),
    (p_tenant_id, 'RE-6.2B', 'Avaliação de Período de Experiência', 'registro', 'Pessoal', 'PR-6.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Nome e Cargo', '{codigo}_{titulo}_Rev{revisao}_{nome}_{cargo}', 're-62b-avaliacao-periodo-experiencia-pdf', 'PR-6.2'),
    (p_tenant_id, 'RE-6.2C', 'Competências do Cargo', 'registro', 'Pessoal', 'PR-6.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Cargo', '{codigo}_{titulo}_Rev{revisao}_{cargo}', 're-62c-competencias-cargo-pdf', 'PR-6.2'),
    (p_tenant_id, 'RE-6.2D', 'Lista de Presença', 'registro', 'Pessoal', 'PR-6.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Curso e Data', '{codigo}_{titulo}_Rev{revisao}_{curso}_{data}', 're-62d-lista-presenca-pdf', 'PR-6.2'),
    (p_tenant_id, 'RE-6.2E', 'Monitoramento de Pessoal', 'registro', 'Pessoal', 'PR-6.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Nome e Cargo', '{codigo}_{titulo}_Rev{revisao}_{nome}_{cargo}', 're-62e-monitoramento-pessoal-pdf', 'PR-6.2'),
    (p_tenant_id, 'RE-6.2F', 'Seleção de Pessoal', 'registro', 'Pessoal', 'PR-6.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Nome e Cargo', '{codigo}_{titulo}_Rev{revisao}_{nome}_{cargo}', 're-62f-selecao-pessoal-pdf', 'PR-6.2'),
    (p_tenant_id, 'RE-6.4A', 'Cronograma de Calibração', 'registro', 'Equipamentos', 'PR-6.4', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.4'),
    (p_tenant_id, 'RE-6.4B', 'Ficha Técnica de Dispositivo', 'registro', 'Equipamentos', 'PR-6.4', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.4'),
    (p_tenant_id, 'RE-6.4C', 'Relação dos Padrões e Equipamentos de Medição', 'registro', 'Equipamentos', 'PR-6.4', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.4'),
    (p_tenant_id, 'RE-6.4D', 'Tabela de correção das Leituras do TBH', 'registro', 'Equipamentos', 'PR-6.4', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.4'),
    (p_tenant_id, 'RE-6.4E', 'Planilha de Correção TBH', 'registro', 'Equipamentos', 'PR-6.4', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.4'),
    (p_tenant_id, 'RE-6.4.10A', 'Programa de Checagem Intermediária', 'registro', 'Equipamentos', 'PR-6.4.10', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.4.10'),
    (p_tenant_id, 'RE-6.4.10B', 'Relatório de Checagem Intermediária', 'registro', 'Equipamentos', 'PR-6.4.10', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.4.10'),
    (p_tenant_id, 'RE-6.4.12A', 'Programa de Manutenção', 'registro', 'Equipamentos', 'PR-6.4.12', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.4.12'),
    (p_tenant_id, 'RE-6.4.12B', 'Verificação de Equipamento', 'registro', 'Equipamentos', 'PR-6.4.12', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Equipamento e Ano', '{codigo}_{titulo}_Rev{revisao}_{equipamento}_{ano}', '', 'PR-6.4.12'),
    (p_tenant_id, 'RE-6.6A', 'Lista de Provedores Aprovados', 'registro', 'Compras', 'PR-6.6', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.6'),
    (p_tenant_id, 'RE-6.6B', 'Relatório de não conformidade no recebimento', 'registro', 'Compras', 'PR-6.6', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-6.6'),
    (p_tenant_id, 'RE-6.6C', 'Solicitação de Orçamento', 'registro', 'Compras', 'PR-6.6', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Fornecedor e Data', '{codigo}_{titulo}_Rev{revisao}_{numero}_{fornecedor}_{data}', 're-66c-solicitacao-orcamento-pdf', 'PR-6.6'),
    (p_tenant_id, 'RE-6.6D', 'Pedido de Compra', 'registro', 'Compras', 'PR-6.6', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Fornecedor e Data', '{codigo}_{titulo}_Rev{revisao}_{numero}_{fornecedor}_{data}', 're-66d-pedido-compra-pdf', 'PR-6.6'),
    (p_tenant_id, 'RE-7.1A', 'Proposta Comercial', 'registro', 'Comercial', 'PR-7.1', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Cliente e Data', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{data}', '', 'PR-7.1'),
    (p_tenant_id, 'RE-7.1B', 'Contrato Comercial', 'registro', 'Comercial', 'PR-7.1', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Cliente e Data', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{data}', '', 'PR-7.1'),
    (p_tenant_id, 'RE-7.1C', 'Emenda Contratual', 'registro', 'Comercial', 'PR-7.1', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Cliente e Data', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{data}', '', 'PR-7.1'),
    (p_tenant_id, 'RE-7.2A', 'Coleta de dados', 'registro', 'Calibração', 'PR-7.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Cliente e Número de Série', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{numeroSerie}', 're-72a-coleta-pdf', 'PR-7.2'),
    (p_tenant_id, 'RE-7.2B', 'Certificado de Calibração', 'registro', 'Calibração', 'PR-7.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Cliente e Número de Série', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{numeroSerie}', '', 'PR-7.2'),
    (p_tenant_id, 'RE-7.2.2A', 'Relatórios de Validação', 'registro', 'Técnico', 'PR-7.2.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-7.2.2'),
    (p_tenant_id, 'RE-7.2.2B', 'Programa de Ensaio de Proficiência', 'registro', 'Técnico', 'PR-7.2.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-7.2.2'),
    (p_tenant_id, 'RE-7.6A', 'Memória de Cálculo', 'registro', 'Técnico', 'PR-7.6', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-7.7'),
    (p_tenant_id, 'RE-7.7A', 'Relatório de Comparações Interna e Externa', 'registro', 'Técnico', 'PR-7.7', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-7.7'),
    (p_tenant_id, 'RE-7.7B', 'Plano de participação em programas de ensaio de proficiência', 'registro', 'Técnico', 'PR-7.7', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-7.7'),
    (p_tenant_id, 'RE-7.9A', 'Reclamação de Clientes', 'registro', 'Comercial', 'PR-7.9', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Cliente e Data', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{data}', '', 'PR-7.9'),
    (p_tenant_id, 'RE-7.10A', 'Trabalho Não-Conforme', 'registro', 'Técnico', 'PR-7.10', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Cliente e Data', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{data}', '', 'PR-7.10'),
    (p_tenant_id, 'RE-7.11A', 'Cálculos Manuscritos para Validação de Planilha', 'registro', 'Técnico', 'PR-7.11', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-7.11'),
    (p_tenant_id, 'RE-8.3A', 'Lista Mestra', 'registro', 'Sistema de Gestão', 'PR-8.3', '03', '2026-06-01', '2026-06-01', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', 're-83a-lista-mestra-pdf', 'PR-8.3'),
    (p_tenant_id, 'RE-4.13A', 'Tabela de Registro', 'registro', 'Registros', 'PR-8.4', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-8.4'),
    (p_tenant_id, 'RE-8.5A', 'Análise de Riscos', 'registro', 'Sistema de Gestão', 'PR-8.5', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-8.5'),
    (p_tenant_id, 'RE-8.6.2A', 'Relatório de Pesquisa de Satisfação', 'registro', 'Comercial', 'PR-8.6.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Cliente e Ano', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{ano}', '', 'PR-8.6.2'),
    (p_tenant_id, 'RE-8.6.2B', 'Questionário de Pesquisa', 'registro', 'Comercial', 'PR-8.6.2', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número, Cliente e Ano', '{codigo}_{titulo}_Rev{revisao}_{numero}_{cliente}_{ano}', '', 'PR-8.6.2'),
    (p_tenant_id, 'RE-8.8A', 'Programa de Auditorias Internas', 'registro', 'Auditoria', 'PR-8.8', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-8.8'),
    (p_tenant_id, 'RE-8.8B', 'Relatório de Auditoria Interna', 'registro', 'Auditoria', 'PR-8.8', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número e Ano', '{codigo}_{titulo}_Rev{revisao}_{numero}_{ano}', '', 'PR-8.8'),
    (p_tenant_id, 'RE-8.8C', 'Relatório de Não Conformidade', 'registro', 'Auditoria', 'PR-8.8', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Número e Ano', '{codigo}_{titulo}_Rev{revisao}_{numero}_{ano}', '', 'PR-8.8'),
    (p_tenant_id, 'RE-8.9A', 'Cronograma de Análise Crítica', 'registro', 'Análise Crítica', 'PR-8.9', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-8.9'),
    (p_tenant_id, 'RE-8.9B', 'Relatório de Análise Crítica', 'registro', 'Análise Crítica', 'PR-8.9', '00', '2025-06-30', '2025-06-30', 'ativo', 'Código + Título + Revisão + Ano', '{codigo}_{titulo}_Rev{revisao}_{ano}', '', 'PR-8.9');

  -- Criar revisões vigentes iniciais
  INSERT INTO public.document_revisions (
    tenant_id, master_document_id, revision_number, issue_date, revision_date, status, change_description
  )
  SELECT
    p_tenant_id, md.id, md.current_revision, md.current_issue_date, md.current_revision_date,
    'vigente', 'Emissão inicial'
  FROM public.master_documents md
  WHERE md.tenant_id = p_tenant_id;

  -- Template links para documentos exportáveis
  INSERT INTO public.document_template_links (tenant_id, master_document_id, template_key, module_name, is_default, is_active)
  SELECT p_tenant_id, id, template_key, linked_module, true, true
  FROM public.master_documents
  WHERE tenant_id = p_tenant_id AND template_key <> '';

  -- Documentos externos de exemplo
  INSERT INTO public.external_document_controls (
    tenant_id, title, consultation_location, issuing_organization, external_revision,
    last_consultation_date, next_consultation_date, validity_status, involved_procedures
  ) VALUES
    (p_tenant_id, 'NBR ISO/IEC 17025:2017', 'ABNT', 'ABNT', '2017', '2025-06-30', '2025-12-30', 'valido', 'Todos os procedimentos'),
    (p_tenant_id, 'DOQ CGCRE 001', 'INMETRO', 'CGCRE', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2, PR-7.8'),
    (p_tenant_id, 'DOQ CGCRE 020', 'INMETRO', 'CGCRE', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'DOQ CGCRE 097', 'INMETRO', 'CGCRE', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'NIT DICLA 012', 'INMETRO', 'DICLA', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-6.4'),
    (p_tenant_id, 'NIT DICLA 021', 'INMETRO', 'DICLA', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-6.4'),
    (p_tenant_id, 'NIT DICLA 026', 'INMETRO', 'DICLA', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-6.4'),
    (p_tenant_id, 'NIT DICLA 030', 'INMETRO', 'DICLA', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'NIT DICLA 031', 'INMETRO', 'DICLA', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'NIE CGCRE 009', 'INMETRO', 'CGCRE', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'NIE CGCRE 140', 'INMETRO', 'CGCRE', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'NIE CGCRE 141', 'INMETRO', 'CGCRE', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'Portaria INMETRO nº 029 — VIM', 'INMETRO', 'INMETRO', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'Sistema Internacional de Unidades — SI', 'BIPM', 'BIPM', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'EURAMET cg-18', 'EURAMET', 'EURAMET', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-7.2'),
    (p_tenant_id, 'OIML R 111-1', 'OIML', 'OIML', 'Vigente', '2025-06-30', '2025-12-30', 'valido', 'PR-6.4');

  -- Calcular próxima análise crítica
  UPDATE public.master_documents
  SET next_critical_analysis_date = public.calculate_next_critical_analysis_date(current_issue_date, critical_analysis_period_months)
  WHERE tenant_id = p_tenant_id;
END;
$$;

-- Seed para tenants existentes
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.tenants
  LOOP
    PERFORM public.seed_master_documents_for_tenant(r.id);
  END LOOP;
END $$;
