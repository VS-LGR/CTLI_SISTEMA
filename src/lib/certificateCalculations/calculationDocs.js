/**
 * Documentação das fórmulas — PR-7.6 / PR-7.8 / RE-7.2B.
 */

export const perPointFormulas = [
  {
    id: "vn",
    result: "Valor de referência (V.R.)",
    formula: "Soma dos V.V.C dos pesos-padrão; correção VCC se ρ_ar ∉ [1,08; 1,32] kg/m³",
    source: "PR-7.2 §6.6 / Cad PESOS-PADRÃO",
  },
  {
    id: "media",
    result: "Média das leituras (Ib)",
    formula: "Ib = média(leituras depois do ajuste); mínimo 3 leituras",
    source: "PR-7.2 §8",
  },
  {
    id: "erro",
    result: "Erro de indicação (E) — cálculo",
    formula: "E = Ib − V.R.",
    source: "PR-7.6 §5.4",
  },
  {
    id: "erro_display",
    result: "Erro de indicação (E) — exibido",
    formula: "MROUND(Ib, d) − MROUND(V.R., d)",
    source: "RE-7.2B Certificado-RBC V49",
  },
  {
    id: "ua",
    result: "Repetitividade (ua)",
    formula: "ua = STDEV(leituras) / √n",
    source: "PR-7.6 §5.3.1 — Tipo A",
  },
  {
    id: "up",
    result: "Padrão (up)",
    formula: "up = √Σ(Ueᵢ/kᵢ)² por peso",
    source: "PR-7.6 §5.3.2",
  },
  {
    id: "ud",
    result: "Deriva (ud)",
    formula: "ud = √Σ(|derivaᵢ|/√3)²; deriva: 1º=Ue, 2º+=VVC−VVC anterior",
    source: "PR-7.6 §5.3.4 / Cad PESOS-PADRÃO",
  },
  {
    id: "ue",
    result: "Empuxo (ue)",
    formula: "ue = V.R. × Urel (aba EMP.P1); fallback PPM se ambientais incompletos",
    source: "PR-7.6 §5.3.5 / RE-7.2B EMP.P1",
  },
  {
    id: "ur",
    result: "Resolução (ur)",
    formula: "ur = d / (2×√3)",
    source: "PR-7.6 §5.3.3",
  },
  {
    id: "uc",
    result: "Incerteza combinada (uc)",
    formula: "uc = √(ua² + up² + ud² + ue² + ur² + upLC²); upLC=0 sem lote",
    source: "PR-7.6 §5.3",
  },
  {
    id: "upLC",
    result: "Lote de carga (upLC)",
    formula: "upLC = uc do passo anterior (Tabela 01: L1+P1→uc(P1), L2+P1→uc(L1+P1), …)",
    source: "PR-7.6 §5.3.2.1",
  },
  {
    id: "nueff",
    result: "Graus de liberdade efetivos (Veff)",
    formula: "Welch-Satterthwaite apenas com ua (ν = n−1); ua=0 → Veff=100; exibição >99 → ∞",
    source: "PR-7.6 §5.3.6 / RE-7.2B Certificado-RBC AA49",
  },
  {
    id: "k",
    result: "Fator de abrangência (k)",
    formula: "T.INV(0,97725; Veff truncado) — confiança 95,45%",
    source: "EA-4/02",
  },
  {
    id: "U",
    result: "Incerteza expandida (U) — cálculo",
    formula: "U = k × uc",
    source: "PR-7.6",
  },
  {
    id: "U_display",
    result: "Incerteza expandida (U) — exibida",
    formula: "MROUND(Ue + (d/10)×4,4, d); d = resolução (AI109), não divisão de verificação",
    source: "RE-7.2B Certificado-RBC Y49 / PR-7.8",
  },
  {
    id: "vr_display",
    result: "V.R. e média — exibidos",
    formula: "MROUND(V.R., d); MROUND(Ib, d)",
    source: "RE-7.2B Certificado-RBC O49/R49",
  },
];

export const conformityFormulas = [
  {
    id: "classe",
    result: "Classe do instrumento",
    formula: "I, II ou III conforme capacidade, resolução e razão C/R",
    source: "Portaria 236",
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
  "Pelo menos um ponto P1–P10 com leituras (mín. 3 depois do ajuste)",
  "Resolução da balança cadastrada",
  "Padrões (pesos) registrados no certificado",
  "Condições ambientais preenchidas",
  "Densidade do material por ponto (coluna AR) ou preset PR-7.8",
];

export const notYetImplemented = [
  "Erro de excentricidade no resultado do certificado",
  "Todas as regras detalhadas da aba Metrologia Legal",
];

/** Checklist de conformidade RE-7.2B Matriz (2) — verificado em testes automatizados. */
export const conformityChecklist = [
  { id: "vcc", item: "V.R. = Σ V.V.C; correção VCC se ρ_ar ∉ [1,08; 1,32]", status: "ok", test: "weights-vvc-ue / environmentalCalculations" },
  { id: "emp", item: "Empuxo ue via aba EMP.Pn (Urel) ou fallback PPM", status: "ok", test: "buoyancyCalculations / validacao-2025" },
  { id: "welch", item: "Welch-Satterthwaite apenas com ua (ν = n−1)", status: "ok", test: "pointCalculations welchSatterthwaiteNuEff" },
  { id: "tinv", item: "k = T.INV(0,97725; Veff truncado)", status: "ok", test: "coverageFactorFromNu / 002-2025" },
  { id: "veff_trunc", item: "Veff truncado (INT); >99 → ∞ na exibição", status: "ok", test: "truncateVeff / xlsmDisplayAudit" },
  { id: "ue_min", item: "Ue exibida: MROUND(Ue + (d/10)×4,4, d); d = resolução balança/ponto", status: "ok", test: "certificateDisplayRounding / validacao-2025" },
  { id: "mround_erro", item: "E exibido = MROUND(Ib,d) − MROUND(V.R.,d)", status: "ok", test: "xlsmMatriz2DisplayAudit" },
  { id: "upLC", item: "upLC Tabela 01 quando AN=sim (P2+)", status: "ok", test: "load-batch-synthetic-p2" },
  { id: "upLC_sheet", item: "Fórmula planilha P2 col AI — referência debug only", status: "debug", test: "calculationTrace upLcSpreadsheet" },
];

export const calculationNotes = [
  "Pontos sem leituras ou valor nominal são ignorados (status: pendente).",
  "Cálculos internos em precisão total; exibição Certificado-RBC (MROUND + fator 4,4 na Ue) só na camada PR-7.8.",
  "Certificado padrão sem declaração de conformidade (PR-7.8).",
];
