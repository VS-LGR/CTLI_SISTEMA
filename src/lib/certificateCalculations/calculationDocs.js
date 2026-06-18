/**
 * Documentação das fórmulas — espelha pointCalculations.js e conformityCalculations.js.
 * Manter alinhado ao código ao alterar cálculos.
 */

export const perPointFormulas = [
  {
    id: "vn",
    result: "Valor de referência (V.R.)",
    formula: "Soma dos V.V.C (valor convencional) dos pesos-padrão selecionados",
    source: "Planilha — aba CAD PESOS-PADRÃO / P1–P10",
  },
  {
    id: "media",
    result: "Média das leituras (L)",
    formula: "L = média(rep1, rep2, rep3)",
    source: "Leituras após ajuste da balança",
  },
  {
    id: "erro",
    result: "Erro de indicação (E)",
    formula: "E = L − VN",
    source: "—",
  },
  {
    id: "erro_antes",
    result: "Erro antes do ajuste",
    formula: "leitura_antes − VN (quando preenchido)",
    source: "Coleta RE-7.2A",
  },
  {
    id: "urep",
    result: "Repetitividade (u_rep)",
    formula: "u_rep = desvio_padrão(rep1..rep3) / √n",
    source: "n = número de leituras válidas",
  },
  {
    id: "ures",
    result: "Contribuição da resolução (u_res)",
    formula: "u_res = d / √3, onde d = resolução da balança",
    source: "balance_snapshot.resolucao",
  },
  {
    id: "upad",
    result: "Contribuição do padrão (u_pad)",
    formula: "u_pad = Ue_combinada / k_padrão (RSS das Ue dos pesos) ou fallback ppm",
    source: "Planilha P1 coluna AD — Ue em gramas do cadastro de pesos",
  },
  {
    id: "uind",
    result: "Contribuição da indicação (u_ind)",
    formula: "|erro_antes| / 2 / √3 ou |E| / 2 / √3",
    source: "Prioriza erro antes do ajuste quando disponível",
  },
  {
    id: "uc",
    result: "Incerteza combinada (u_c)",
    formula: "u_c = √(u_rep² + u_res² + u_pad² + u_ind²)",
    source: "—",
  },
  {
    id: "nueff",
    result: "Graus de liberdade efetivos (ν_eff)",
    formula: "Derivado de u_rep e do número de leituras n",
    source: "—",
  },
  {
    id: "k",
    result: "Fator de abrangência (k)",
    formula: "Aproximação da distribuição t (~95,45% de confiança)",
    source: "Limitado entre 2 e 3",
  },
  {
    id: "U",
    result: "Incerteza expandida (U)",
    formula: "U = k × u_c",
    source: "Exibida no certificado e no PDF",
  },
];

export const conformityFormulas = [
  {
    id: "classe",
    result: "Classe do instrumento",
    formula: "I, II ou III conforme capacidade, resolução e razão C/R",
    source: "Dados da balança (portaria / etiqueta IPEM quando aplicável)",
  },
  {
    id: "tolerancia",
    result: "Tolerância OIML",
    formula: "Classe I: ±0,1% · Classe II: ±0,2% · Classe III: ±0,5% do valor nominal",
    source: "Valor nominal do ponto",
  },
  {
    id: "decisao_simples",
    result: "Regra simples",
    formula: "Conforme se E está dentro da tolerância positiva e negativa",
    source: "decision_rule = simples",
  },
  {
    id: "decisao_eu",
    result: "Erro + incerteza",
    formula: "Conforme se (E + U) está dentro da tolerância",
    source: "decision_rule = erro_mais_incerteza",
  },
];

export const dataRequirements = [
  "Coleta vinculada com cliente e balança preenchidos",
  "Data da calibração definida",
  "Executor informado",
  "Pelo menos um ponto P1–P10 com leituras",
  "Resolução da balança cadastrada na coleta",
  "Padrões (pesos e/ou TBH) registrados no certificado",
  "Condições ambientais preenchidas",
];

export const notYetImplemented = [
  "Correções ambientais nas leituras (temperatura, umidade, pressão)",
  "Erro de excentricidade no resultado do certificado",
  "Todas as regras detalhadas da aba Metr. Legal da planilha oficial",
];

export const calculationNotes = [
  "Pontos sem leituras ou valor nominal são ignorados (status: pendente).",
  "Pontos incompletos não geram NaN, #DIV/0! nem valores inválidos no PDF.",
  "O cálculo é repetido por ponto ativo (P1 a P10); pontos vazios não aparecem no PDF.",
];
