/** Categorias de listas padrão — alinhadas ao CHECK em personnel_standard_options */

export const PERSONNEL_OPTION_CATEGORIES = [
  { value: "education_level", label: "Nível de Formação" },
  { value: "internal_training", label: "Treinamentos Internos" },
  { value: "general_knowledge", label: "Conhecimentos Gerais" },
  { value: "technical_knowledge", label: "Conhecimentos Técnicos" },
  { value: "skill", label: "Habilidades" },
  { value: "qualification", label: "Qualificações" },
  { value: "experience", label: "Experiência" },
  { value: "monitoring_method", label: "Métodos de Monitoramento" },
  { value: "monitoring_reason", label: "Motivos de Monitoramento" },
  { value: "training_classification", label: "Classificação de Treinamento" },
  { value: "suitability_status", label: "Funcionário está apto" },
  { value: "training_need", label: "Houve Necessidade de Novos Treinamentos" },
];

export const categoryLabel = (v) =>
  PERSONNEL_OPTION_CATEGORIES.find((c) => c.value === v)?.label || v || "—";

/** Valores iniciais por tenant (spec 6.2) */
export const PERSONNEL_DEFAULT_OPTIONS = {
  education_level: [
    "Ensino Fundamental incompleto",
    "Ensino Fundamental completo",
    "Ensino Médio incompleto",
    "Ensino Médio completo",
    "Ensino Técnico Completo",
    "Ensino Superior incompleto",
    "Ensino Superior completo",
    "Mestrado incompleto",
    "Mestrado completo",
  ],
  internal_training: [
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
    "Não Aplicável",
  ],
  general_knowledge: [
    "Office (Word, Excel, PowerPoint)",
    "Domínio de Utilização da Internet",
    "Carteira de Motorista",
  ],
  technical_knowledge: [
    "Especialização em Fabricantes",
    "Manutenção de Balanças Classe I, II, III e IIII",
  ],
  skill: [
    "Trabalho em Equipe",
    "Relacionamento Interpessoal",
    "Liderança de Equipe",
    "Tomada de Decisão",
    "Análise e Solução de Problemas",
    "Comunicação",
  ],
  qualification: [
    "Treinamento em Avaliação da Incerteza de Medição",
    "Treinamento em Calibração de Balanças",
    "Treinamento em Interpretação e Formação de Auditor - Norma NBR ISO/IEC 17025:2017",
    "Office (Word, Excel, PowerPoint)",
    "Especialização em Fabricantes",
    "Manutenção de Balanças Classe I, II, III e IIII",
  ],
  experience: ["Experiência anterior na área.", "Não aplicável."],
  monitoring_method: [
    "Não Aplicável",
    "Participação em Intralaboratoriais",
    "Participação em Interlaboratoriais",
    "Participação em Intralaboratoriais e Interlaboratoriais",
    "Supervisão de Tarefas Atribuídas à Função",
  ],
  monitoring_reason: [
    "Avaliação Inicial",
    "Adequação a Não Conformidade",
    "Aquisição de novas tecnologias",
    "Aumento na demanda de trabalhos",
    "Defasagem entre o currículo do pessoal em relação aos requisitos da descrição da função",
    "Introdução de novos métodos, procedimentos de medição, processos, instrumentos",
    "Mudança no tipo de trabalho",
    "Promoção",
    "Reciclagem nas políticas e procedimentos do Laboratório",
    "Revisão nas políticas e procedimentos",
    "Treinamento identificado com o funcionário",
    "Treinamento para requalificar o funcionário que não está exercendo as operações de forma satisfatória",
  ],
  training_classification: [
    "Treinamento Interno",
    "Treinamentos Externo",
    "Treinamento Interno e Externo",
  ],
  suitability_status: ["Sim", "Não, requer treinamentos complementares"],
  training_need: ["Sim", "Não"],
};

export const NOT_APPLICABLE_LABEL = "Não Aplicável";

export function labelsFromOptionItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((x) => (typeof x === "string" ? x : x?.label)).filter(Boolean);
}

export function optionItemsFromLabels(labels) {
  return (labels || []).map((label) => ({ label, id: null }));
}
