export const DEFAULT_PROPOSAL_FORM_CODE = "RE-7.1A";
export const DEFAULT_PROPOSAL_FORM_TITLE = "Proposta Comercial";
export const DEFAULT_PROPOSAL_FORM_REF = "PR-7.1";
export const DEFAULT_PROPOSAL_FORM_REVISION = "Rev.00 de 30.06.2025";
export const DEFAULT_PROPOSAL_MODEL_ISSUE_DATE = "2025-06-30";

export const DEFAULT_PROPOSAL_BOILERPLATE = {
  intro_text:
    "Atendendo sua solicitação, apresentamos nossa proposta para fornecimento de serviço de calibração dos itens conforme descritos abaixo:",
  mileage_note:
    "OBS: Estão inclusas no preço, despesas com quilometragem, tempo de serviço e deslocamento do técnico.",
  responsibilities: `Manter ligado o equipamento antes do técnico chegar ao local para o serviço;
Liberação da área para realização do serviço;
Disponibilização do equipamento em tempo necessário a realização do serviço, ou seja, o equipamento não poderá operar durante a realização do serviço;
Informação previa da realização do treinamento, (integração) quando exigido pelo setor de segurança; esta exigência poderá alterar os preços deste orçamento;
Mobilização, procedimentos e documentação exigida pela área, onde está instalado o equipamento; esta exigência poderá alterar os preços deste orçamento;
Almoço ao nosso pessoal;`,
  supply_conditions: `A Calibração será realizada nas instalações do Cliente. A data da realização do serviço será programada após aprovação formal desta Proposta.
Após o agendamento das calibrações, havendo o deslocamento e não realizados os serviços por indisponibilidade ou quebra das balanças, poderá ser cobrada taxa de transporte dos técnicos e equipamentos.
O Certificado de Calibração é enviado no prazo máximo de 10 dias úteis.
Quando aplicável solicitado, o serviço não fará parte do escopo de acreditação.`,
  technical_info: `1. O método utilizado tem como referência os documentos Guidelines on the calibration of non-automatic weighing instruments euramet/cg-18/ Version 4.0) e DOQ CGCRE 097 Orientações para calibração de balanças, pesos-padrão e medição de massa de peças diversas.
2. A calibração será realizada pelo método de comparação direta, que consiste em comparar o valor de um padrão de referência e as leituras indicadas pelo instrumento, conforme procedimento interno PR-7.2 Calibração de balanças Rev.00. São realizadas de 03 a 5 leituras por ponto a ser calibrado, dependendo da Faixa de calibração. Caso o cliente não defina os pontos de calibração, o laboratório adotará os pontos definidos no procedimento citado, sendo a Carga Mínima, Carga Máxima, 25% da carga, metade e 75% da Carga Máxima como pontos obrigatórios (a menos que o cliente não queira, ou que não seja realizável).
3. Os pesos-padrão utilizados nas calibrações são rastreados aos padrões do INMETRO ou a laboratórios acreditados pela CGCRE.
4. O certificado de Calibração emitido atende aos requisitos da NBR ISO/IEC 17025:2017. A Incerteza Expandida (Ue) associada a cada ponto da escala da balança a ser calibrado é obtida através de uma incerteza padrão combinada, multiplicada por um fator de abrangência k, para uma probabilidade de abrangência de aproximadamente 95,45% de acordo com a publicação EA-4/02.
5. Contamos com uma equipe técnica altamente qualificada e treinada para melhor atender sua empresa.
6. O método está validado através de Comparações Interlaboratoriais de acordo os requisitos do documento NIT-DICLA-026 publicado pela DICLA. Estas comparações são realizadas em entidades acreditadas pela CGCRE`,
  payment: `07 dias da data da fatura
Se houver atraso, serão cobrados juros moratórios de 12% (doze por cento) ao ano e multa de 10% (dez por cento) sobre o valor do débito, corrigido pela variação do IGPM (Índice Geral de Preços do Mercado) ou, na sua falta, do IGP-DI (Índice Geral de Preços – Disponibilidade Interna), publicados pela FGV, ou, na sua falta, do IPC (Índice de Preços ao Consumidor), publicado pela FIPE (Fundação Instituto de Pesquisas Econômicas da USP).`,
  working_hours:
    "Os serviços devem ser realizados dentro do horário normal do laboratório, ou seja, de segunda a sexta-feira, das 7h30 as 17h30. Os serviços prestados fora deste horário serão cobrados com os mesmos adicionais previstos na legislação trabalhista ou acordo sindical que são pagos aos funcionários do laboratório.",
  validity_days: "10 dias, a contar desta data",
};

export function getProposalBoilerplate(tenant) {
  const stored = tenant?.commercial_proposal_boilerplate || {};
  return { ...DEFAULT_PROPOSAL_BOILERPLATE, ...stored };
}
