# QO — Fórmulas de certificado (incerteza / conformidade)

**Documento:** rascunho de protocolo (15/09/2026). Campos de execução em branco.  
**Jest / xlsm:** evidência de **desenvolvimento**, não substitui este QO.

Ambiente: ____________  Data: ____________  Executor: ____________  Aprovador GQ: ____________

## Pré-requisitos

- Dados de ensaio (não produção, salvo autorização).  
- Calculadora/folha de prova manual.  
- Suites: `src/lib/certificateCalculations/*.test.js` e pesos `weightCalibrationCalculations`.

## Casos

| ID | Passo | Esperado | Resultado | Evidência |
|----|-------|----------|-----------|-----------|
| QO-F-01 | Inserir 10 pontos de balança com padrões conhecidos e calcular | Valores iguais à prova manual (tolerância de arredondamento documentada) | | |
| QO-F-02 | Alterar um ponto e recalcular | Só esse ponto e derivados mudam; trilha old/new se certificado ainda editável | | |
| QO-F-03 | Caso de conformidade / não conformidade | Flag igual à regra ISO/procedimento do lab | | |
| QO-F-04 | Densidade do ar / empuxo | Coincide com prova | | |
| QO-F-05 | Item de peso-padrão (classe) | Massa convencional / incerteza iguais à prova | | |
| QO-F-06 | Entrada inválida (vazio / não numérico) | Recusa ou status de erro; não emite | | |
| QO-F-07 | Anexar log Jest da versão congelada | Pass no CI/local da mesma versão npm | | |

**Critério:** QO-F-01…06 Pass com prova manual. QO-F-07 complementar.

## Desvios

| Desvio | Impacto | Ação | Fecho |
|--------|---------|------|-------|
| | | | |
