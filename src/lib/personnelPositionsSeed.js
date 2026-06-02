/**
 * Cargos padrão CTLI — competências conforme descrições de função do SGQ.
 * Inseridos por tenant na primeira utilização (se não existir nenhum cargo).
 */

import { optionItemsFromLabels } from "@/lib/personnelConstants";

const L = optionItemsFromLabels;

/** Mapeamento job_role legado → título do cargo padrão */
export const JOB_ROLE_TO_POSITION_TITLE = {
  compras_vendas: "Auxiliar Administrativo Compras e Vendas",
  compras: "Auxiliar Administrativo Compras e Vendas",
  vendas: "Auxiliar Administrativo Compras e Vendas",
  auxiliar_administrativo: "Auxiliar Administrativo Compras e Vendas",
  auxiliar_tecnico: "Auxiliar Técnico",
  tecnico_em_balancas: "Técnico em Balanças",
  gerente_qualidade: "Gerente da Qualidade",
  gerente_tecnico: "Gerente Técnico",
  signatario: "Signatário",
  diretor: "Diretor",
};

export const DEFAULT_PERSONNEL_POSITIONS = [
  {
    title: "Auxiliar Administrativo Compras e Vendas",
    required_education: "Ensino Médio completo",
    desired_education: "Ensino Superior completo",
    qualification: [],
    experience: L(["Experiência anterior na área."]),
    skills: L([
      "Trabalho em Equipe",
      "Relacionamento Interpessoal",
      "Análise e Solução de Problemas",
      "Comunicação",
    ]),
    general_knowledge: L([
      "Office (Word, Excel, PowerPoint)",
      "Domínio de Utilização da Internet",
    ]),
    technical_knowledge: [],
    function_activities: `- Missão: Esta função tem a responsabilidade sobre as negociações comerciais com os clientes, bem como sobre a emissão de solicitações de orçamentos e pedidos de compras para a provisão de produtos e serviços e executar serviços de apoio à administração em suas atividades diárias.
- Responsabilidade da função:
Estruturação e organização de arquivos de documentos;
Preenchimento de formulários, planilhas e outros documentos;
Atendimento (telefone, e-mail);
Emitir e revisar propostas e contratos comerciais.
Negociar comercialmente com os clientes sobre assuntos financeiros.
Consultar a Lista de Provedores Aprovados.
Emitir solicitações de compras.
Emitir pedidos de compras.
- Principais inter-relações do Comercial:
- Comercial - Vendas:
Com os clientes durante as negociações.
Com a Gestão da Qualidade durante as avaliações internas.
Com os avaliadores durante avaliações externas.
Com o Gerente Técnico para obter esclarecimentos, informações, concessões técnicas, análise crítica e aprovação de propostas ou contratos comerciais.
- Comercial - Compras:
Com o Gerente Técnico para levantamento de recursos financeiros.
Com os provedores externos durante as negociações.
Com a Gestão da Qualidade durante as avaliações internas.
Com os avaliadores durante avaliações externas.
Com o Gerente da Qualidade para obter esclarecimentos, informações e aprovação para provisão de produtos e serviços.`,
    technical_authorities: `Qualificar provedores para o Laboratório
Aprovar os dados técnicos de produtos e serviços providos externamente
Fazer limpeza e organizar o laboratório
Decidir sobre produtos adquiridos não-conforme
Enviar certificado de calibração para o cliente
Fazer inspeção de recebimento dos produtos e serviços adquiridos`,
    managerial_authorities: `Registrar reclamação de cliente ou outra parte
Representar a empresa junto ao Cgcre.
Vender serviço de calibração de Balanças
Esclarecer e orientar os clientes sobre assuntos comerciais
Vender serviço de ajuste de balança
Vender serviço de manutenção de balança`,
    internal_trainings: L([
      "PR-4.1 Confidencialidade e Imparcialidade",
      "PR-6.6 Produtos e Serviços Providos Externamente",
      "PR-7.1 Análise Crítica de Pedidos, Propostas e Contratos",
      "PR-7.1.7 Atendimento ao Cliente",
    ]),
  },
  {
    title: "Auxiliar Técnico",
    required_education: "Ensino Fundamental completo",
    desired_education: "Ensino Médio completo",
    qualification: [],
    experience: L(["Experiência anterior na área."]),
    skills: L([
      "Trabalho em Equipe",
      "Relacionamento Interpessoal",
      "Análise e Solução de Problemas",
      "Comunicação",
    ]),
    general_knowledge: L(["Carteira de Motorista"]),
    technical_knowledge: [],
    function_activities: `Esta função tem a responsabilidade sobre auxiliar na execução dos ensaios e/ou calibrações (manuseio) de acordo com os procedimentos adotados assegurando sempre a qualidade requerida dos serviços. De um modo mais específico suas principais autoridades são:
· Manusear, armazenar, transportar e usar padrões, equipamentos e suprimentos;
· Manusear, armazenar, transportar e usar padrões, equipamentos e suprimentos desde que supervisionado.

As principais inter-relações são:
· Com os clientes durante os trabalhos externos;
· Com a Gestão da Qualidade durante as auditorias internas;
· Com os avaliadores durante auditorias externas.`,
    technical_authorities: `Fazer limpeza e organizar o laboratório
Manusear balanças, pesos e termo-baro-higrômetro`,
    managerial_authorities: "Registrar reclamação de cliente ou outra parte",
    internal_trainings: L([
      "PR-4.1 Confidencialidade e Imparcialidade",
      "PR-7.4 Manuseio de Itens de Calibração",
      "PR-7.2 Calibração de Balanças",
    ]),
  },
  {
    title: "Técnico em Balanças",
    required_education: "Ensino Fundamental completo",
    desired_education: "Ensino Médio completo",
    qualification: [],
    experience: L(["Experiência anterior na área."]),
    skills: L([
      "Trabalho em Equipe",
      "Relacionamento Interpessoal",
      "Análise e Solução de Problemas",
      "Comunicação",
    ]),
    general_knowledge: L(["Carteira de Motorista"]),
    technical_knowledge: [],
    function_activities: `Missão: Esta função tem a responsabilidade da execução de calibrações de balanças, acreditadas a RBC, incluindo a movimentação dos pesos-padrão e equipamentos auxiliares de acordo com os procedimentos adotados assegurando sempre a qualidade requerida para o manuseio, transporte e armazenamento.

Responsabilidades da função:
- Executar calibrações de balanças analíticas, semi-analíticas, digitais, industriais e rodoviárias
- Coletar os dados da calibração
- Manusear, armazenar, transportar e usar padrões, equipamentos e suprimentos.

As principais inter-relações do Técnico RBC são:
• Com os clientes durante os trabalhos externos
• Com o Gerente Técnico para repasse das informações das calibrações realizadas
• Com a Gestão da Qualidade durante as avaliações internas
• Com os avaliadores durante avaliações externas`,
    technical_authorities: `Executar manutenção e ajuste de balanças
Executar calibração de balança analítica e semi-analítica
Executar calibração de balança industrial
Executar calibração de balança rodoviária
Monitorar e registrar condições ambientais necessárias para calibração
Fazer limpeza e organizar o laboratório
Manusear balanças, pesos e termo-baro-higrômetro
Participar das comparações interlaboratoriais e intralaboratoriais`,
    managerial_authorities: "Registrar reclamação de cliente ou outra parte",
    internal_trainings: L([
      "PR-4.1 Confidencialidade e Imparcialidade",
      "PR-7.2 Calibração de Balanças",
      "PR-7.4 Manuseio de Itens de Calibração",
    ]),
  },
  {
    title: "Gerente da Qualidade",
    required_education: "Ensino Médio completo",
    desired_education: "Ensino Superior completo",
    qualification: L([
      "Treinamento em Interpretação e Formação de Auditor - Norma NBR ISO/IEC 17025:2017",
    ]),
    experience: L(["Experiência anterior na área."]),
    skills: L([
      "Trabalho em Equipe",
      "Relacionamento Interpessoal",
      "Liderança de Equipe",
      "Tomada de Decisão",
      "Análise e Solução de Problemas",
      "Comunicação",
    ]),
    general_knowledge: L([
      "Domínio de Utilização da Internet",
      "Carteira de Motorista",
      "Office (Word, Excel, PowerPoint)",
    ]),
    technical_knowledge: [],
    function_activities: `Missão: Desenvolver, documentar e manter atualizado o sistema de gestão da qualidade, coordenando com as demais áreas a execução dos planos de melhoria da qualidade.

Responsabilidades da função:
- Garantir o atendimento aos requisitos e regulamentos da acreditação estabelecidos pela CGCRE;
- Assegurar que os processos necessários para o sistema de gestão da qualidade sejam estabelecidos, implantados e mantidos;
- Relatar a Direção o desempenho do sistema de gestão da qualidade e a necessidade de melhoria;
- Assegurar a promoção da conscientização sobre os requisitos do cliente em toda organização;
- Planejar e gerenciar as atividades de auditorias interna da qualidade;
- Coordenar a elaboração de procedimentos da qualidade, instruções e outros;
- Representar a organização em eventos, reuniões, palestras, etc., relacionados a qualidade;
- Planejar, registrar e acompanhar o plano de melhoria das reuniões de análise crítica pela Direção;
- Controlar, revisar e manter a documentação e registro do sistema da qualidade;
- Realizar auditoria interna e atender auditorias externas;
- Manter a direção atualizada com os indicadores da qualidade;
- Tratar não-conformidades, riscos, satisfação de clientes, competências e provedores;
- Zelar pelo patrimônio da empresa.

As principais inter-relações do Gerente da Qualidade são com vendas, compras, Diretoria, CGCRE, clientes e setor Técnico.`,
    technical_authorities: `Qualificar fornecedores para o Laboratório
Aprovar os dados técnicos de produtos e serviços providos externamente
Fazer inspeção de recebimento dos produtos e serviços adquiridos
Decidir sobre produtos adquiridos não-conforme
Emitir certificado de calibração
Conferir os valores inseridos para emissão de certificado
Analisar e aprovar o certificado de calibração
Enviar certificado de calibração para o cliente
Esclarecer e orientar os clientes sobre assuntos técnicos de calibração
Fazer limpeza e organizar o laboratório
Selecionar, desenvolver (quando necessário) e validar métodos
Definir as estimativas que compõem a incerteza expandida declarada
Validar a planilha de cálculo e proteger contra alterações indevidas
Controlar os pesos-padrão e termo-baro-higrômetro
Manter os padrões rastreados ao SI através da calibração em membros da RBC
Participar das comparações interlaboratoriais e intralaboratoriais`,
    managerial_authorities: `Responsável por aprovação, emissão e alteração de documentos
Vender serviço de manutenção de balança
Esclarecer e orientar os clientes sobre assuntos comerciais
Vender serviço de ajuste de balança
Gerenciar os trabalhos não-conformes
Autorizar a retomada de trabalho paralizado devido a não-conformidade
Pesquisar a satisfação dos clientes
Registrar reclamação de cliente ou outra parte
Solucionar reclamação de cliente ou outra parte
Implementar ações corretivas, preventivas e oportunidades de melhoria
Manter o controle sobre os registros da qualidade
Planejar Auditorias Internas
Programar as Análises Críticas pela Gerência
Conduzir e tomar decisões nas reuniões de análise crítica pela gerência
Representar a empresa junto ao Cgcre.`,
    internal_trainings: L([
      "MQ-000 Manual da Qualidade",
      "PR-4.1 Confidencialidade e Imparcialidade",
      "PR-6.2 Pessoal",
      "PR-6.4 Equipamentos",
      "PR-6.4.10 Checagem Intermediária",
      "PR-6.4.12 Manutenção de Equipamentos",
      "PR-6.5 Rastreabilidade da Medição",
      "PR-6.6 Produtos e Serviços Providos Externamente",
      "PR-7.1 Análise Crítica de Pedidos, Propostas e Contratos",
      "PR-7.1.7 Atendimento ao Cliente",
      "PR-7.2 Calibração de Balanças",
      "PR-7.2.2 Validação de Método",
      "PR-7.4 Manuseio de Itens de Calibração",
      "PR-7.6 Avaliação da Incerteza de Medição",
      "PR-7.7 Garantia da Validade dos Resultados",
      "PR-7.8 Relato de Resultados",
      "PR-7.9 Reclamação",
      "PR-7.10 Trabalho Não-Conforme",
      "PR-7.11 Controle de Dados e Gestão da Informação",
      "PR-8.3 Emissão e Controle de Documentos",
      "PR-8.4 Controle de Registros",
      "PR-8.5 Análise de Riscos e Oportunidades",
      "PR-8.6.2 Monitoramento da Satisfação dos Clientes",
      "PR-8.7 Ações Corretivas",
      "PR-8.8 Auditoria Interna",
      "PR-8.9 Análise Crítica pela Gerência",
    ]),
  },
  {
    title: "Gerente Técnico",
    required_education: "Ensino Médio completo",
    desired_education: "Ensino Superior completo",
    qualification: L([
      "Treinamento em Calibração de Balanças",
      "Treinamento em Avaliação da Incerteza de Medição",
      "Treinamento em Interpretação e Formação de Auditor - Norma NBR ISO/IEC 17025:2017",
    ]),
    experience: L(["Experiência anterior na área."]),
    skills: L([
      "Trabalho em Equipe",
      "Relacionamento Interpessoal",
      "Liderança de Equipe",
      "Tomada de Decisão",
      "Análise e Solução de Problemas",
      "Comunicação",
    ]),
    general_knowledge: L([
      "Domínio de Utilização da Internet",
      "Carteira de Motorista",
      "Office (Word, Excel, PowerPoint)",
    ]),
    technical_knowledge: [],
    function_activities: `Missão: Manter as operações técnicas e provisão dos recursos necessários à qualidade requerida de suas operações.

Responsabilidades da Função (resumo): garantir requisitos CGCRE; supervisionar e autorizar técnicos; aprovar confiabilidade de padrões; prover recursos; analisar certificados de padrões; definir requisitos de aquisição; decidir retomada após não-conformidade; garantir qualidade dos resultados; manter independência técnica; desenvolver e validar métodos; coordenar interlaboratoriais; documentar falhas; ações corretivas; análise crítica de novos trabalhos; emitir certificados e solicitar aprovação do signatário.

Inter-relações: vendas, compras, Diretoria, CGCRE, clientes e Gestão da Qualidade.`,
    technical_authorities: `Analisar e aprovar o certificado de calibração
Aprovar os dados técnicos de produtos e serviços providos externamente
Conferir os valores inseridos para emissão de certificado
Controlar os pesos-padrão e termo-baro-higrômetro
Decidir sobre produtos adquiridos não-conforme
Definir as estimativas que compõem a incerteza expandida declarada
Emitir certificado de calibração
Enviar certificado de calibração para o cliente
Esclarecer e orientar os clientes sobre assuntos técnicos de calibração
Executar calibração de balança analítica e semi-analítica
Executar calibração de balança industrial
Executar calibração de balança rodoviária
Fazer inspeção de recebimento dos produtos e serviços adquiridos
Fazer limpeza e organizar o laboratório
Liberar recursos para assegurar a competência de todos funcionários
Manter os padrões rastreados ao SI através da calibração em membros da RBC
Manusear balanças, pesos e termo-baro-higrômetro
Monitorar e registrar condições ambientais necessárias para calibração
Participar das comparações interlaboratoriais e intralaboratoriais
Programar a execução dos serviços de calibração
Qualificar provedores para o Laboratório
Selecionar, desenvolver (quando necessário) e validar métodos
Validar a planilha de cálculo e proteger contra alterações indevidas`,
    managerial_authorities: `Responsável por aprovação, emissão e alteração de documentos
Autorizar os funcionários a realizar atividades técnicas
Esclarecer e orientar os clientes sobre assuntos comerciais
Autorizar os funcionários a realizar atividades gerenciais
Gerenciar os trabalhos não-conformes
Autorizar a retomada de trabalho paralizado devido a não-conformidade
Registrar reclamação de cliente ou outra parte
Solucionar reclamação de cliente ou outra parte
Implementar ações corretivas, preventivas e oportunidades de melhoria
Programar as Análises Críticas pela Gerência
Conduzir e tomar decisões nas reuniões de análise crítica pela gerência
Representar a empresa junto ao Cgcre.`,
    internal_trainings: L([
      "MQ-000 Manual da Qualidade",
      "PR-4.1 Confidencialidade e Imparcialidade",
      "PR-6.2 Pessoal",
      "PR-6.4 Equipamentos",
      "PR-6.4.10 Checagem Intermediária",
      "PR-6.4.12 Manutenção de Equipamentos",
      "PR-6.5 Rastreabilidade da Medição",
      "PR-6.6 Produtos e Serviços Providos Externamente",
      "PR-7.1 Análise Crítica de Pedidos, Propostas e Contratos",
      "PR-7.1.7 Atendimento ao Cliente",
      "PR-7.2 Calibração de Balanças",
      "PR-7.2.2 Validação de Método",
      "PR-7.4 Manuseio de Itens de Calibração",
      "PR-7.6 Avaliação da Incerteza de Medição",
      "PR-7.7 Garantia da Validade dos Resultados",
      "PR-7.8 Relato de Resultados",
      "PR-7.9 Reclamação",
      "PR-7.10 Trabalho Não-Conforme",
      "PR-7.11 Controle de Dados e Gestão da Informação",
      "PR-8.3 Emissão e Controle de Documentos",
      "PR-8.4 Controle de Registros",
      "PR-8.5 Análise de Riscos e Oportunidades",
      "PR-8.6.2 Monitoramento da Satisfação dos Clientes",
      "PR-8.7 Ações Corretivas",
      "PR-8.8 Auditoria Interna",
      "PR-8.9 Análise Crítica pela Gerência",
    ]),
  },
  {
    title: "Signatário",
    required_education: "Ensino Médio completo",
    desired_education: "Ensino Superior completo",
    qualification: L([
      "Treinamento em Calibração de Balanças",
      "Treinamento em Avaliação da Incerteza de Medição",
      "Treinamento em Interpretação e Formação de Auditor - Norma NBR ISO/IEC 17025:2017",
    ]),
    experience: L(["Não aplicável."]),
    skills: L([
      "Trabalho em Equipe",
      "Relacionamento Interpessoal",
      "Liderança de Equipe",
      "Tomada de Decisão",
      "Análise e Solução de Problemas",
      "Comunicação",
    ]),
    general_knowledge: L([
      "Domínio de Utilização da Internet",
      "Office (Word, Excel, PowerPoint)",
    ]),
    technical_knowledge: [],
    function_activities: `Missão: Manter as operações técnicas necessárias à qualidade requerida nos trabalhos de calibração.

Responsabilidades da Função: garantir requisitos CGCRE; supervisionar e autorizar técnicos; aprovar confiabilidade de padrões; analisar certificados de padrões; definir requisitos de aquisição; decidir retomada após não-conformidade; garantir qualidade; desenvolver métodos; nomear signatários; coordenar interlaboratoriais; ações corretivas; emitir, analisar e aprovar certificados com responsabilidade técnica pelo conteúdo.

Inter-relações: vendas, compras, Diretoria, CGCRE, clientes e Gestão da Qualidade.`,
    technical_authorities: `Programar a execução dos serviços de calibração
Decidir sobre produtos adquiridos não-conforme
Emitir certificado de calibração
Conferir os valores inseridos para emissão de certificado
Analisar e aprovar o certificado de calibração
Enviar certificado de calibração para o cliente
Esclarecer e orientar os clientes sobre assuntos técnicos de calibração
Fazer limpeza e organizar o laboratório
Selecionar, desenvolver (quando necessário) e validar métodos
Definir as estimativas que compõem a incerteza expandida declarada
Validar a planilha de cálculo e proteger contra alterações indevidas
Manter os padrões rastreados ao SI através da calibração em membros da RBC
Controlar os pesos-padrão e termo-baro-higrômetro
Manusear balanças, pesos e termo-baro-higrômetro
Participar das comparações interlaboratoriais e intralaboratoriais`,
    managerial_authorities: `Autorizar os funcionários a realizar atividades técnicas
Responsável por aprovação, emissão e alteração de documentos
Esclarecer e orientar os clientes sobre assuntos comerciais
Autorizar os funcionários a realizar atividades gerenciais
Gerenciar os trabalhos não-conformes
Autorizar a retomada de trabalho paralizado devido a não-conformidade
Registrar reclamação de cliente ou outra parte
Solucionar reclamação de cliente ou outra parte
Implementar ações corretivas, preventivas e oportunidades de melhoria
Conduzir e tomar decisões nas reuniões de análise crítica pela gerência
Representar a empresa junto ao Cgcre.`,
    internal_trainings: L([
      "MQ-000 Manual da Qualidade",
      "PR-4.1 Confidencialidade e Imparcialidade",
    ]),
  },
  {
    title: "Diretor",
    required_education: "Ensino Fundamental completo",
    desired_education: "Ensino Médio completo",
    qualification: L([
      "Treinamento em Interpretação e Formação de Auditor - Norma NBR ISO/IEC 17025:2017",
    ]),
    experience: L(["Não aplicável."]),
    skills: L([
      "Trabalho em Equipe",
      "Relacionamento Interpessoal",
      "Liderança de Equipe",
      "Tomada de Decisão",
      "Análise e Solução de Problemas",
      "Comunicação",
    ]),
    general_knowledge: L([
      "Domínio de Utilização da Internet",
      "Carteira de Motorista",
      "Office (Word, Excel, PowerPoint)",
    ]),
    technical_knowledge: [],
    function_activities: `Missão: Direcionar a empresa aos objetivos estratégicos.

Responsabilidades da Função:
- Administrar a empresa de acordo com a legislação e estatuto vigente
- Coordenar as atividades de planejamento estratégico da empresa
- Elaborar, coordenar e implantar o planejamento estratégico da empresa
- Definir as políticas, objetivos e metas administrativas
- Disponibilizar recursos para manutenção do sistema de gestão da qualidade
- Aprovar documentos do sistema de gestão da qualidade
- Nomear um Representante da Direção para gerenciamento do sistema de gestão da qualidade`,
    technical_authorities: "Liberar recursos para assegurar a competência de todos funcionários",
    managerial_authorities: `Liberar recursos para manutenção do sistema de gestão da qualidade
Representar a empresa junto ao Cgcre.`,
    internal_trainings: L([
      "MQ-000 Manual da Qualidade",
      "PR-4.1 Confidencialidade e Imparcialidade",
    ]),
  },
];
