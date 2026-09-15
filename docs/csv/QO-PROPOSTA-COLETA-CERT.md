# QO — Fluxo proposta → coleta → certificado

**Documento:** rascunho (15/09/2026). Inclui voz após CC-PR72 quando aplicável.  
Ambiente: ____________  Data: ____________  Executor: ____________  Aprovador GQ: ____________

## Balanças

| ID | Passo | Esperado | Resultado | Evidência |
|----|-------|----------|-----------|-----------|
| QO-FL-01 | Criar proposta RE-7.1A e gerar OS/coleta | Coleta ligada à proposta; dados do cliente copiados | | |
| QO-FL-02 | Preencher coleta RE-7.2A e conferir | `workflow_status` permite certificado oficial | | |
| QO-FL-03 | Gerar certificado a partir da coleta | Pontos/padrões/ambiente no certificado; prévia se coleta incompleta | | |
| QO-FL-04 | Enviar para aprovação | Status `aguardando_aprovacao`; técnico sem papel de aprovar é recusado no servidor | | |
| QO-FL-05 | Aprovar **com e-sign** (senha no ato) | Status `aprovado`; review `aprovacao`; ator = utilizador da senha | | |
| QO-FL-06 | Emitir **com e-sign** | Status `emitido`; snapshot; PDF; lock (UPDATE de pontos recusado) | | |
| QO-FL-07 | Tentar apagar/alterar certificado emitido | Recusa no servidor | | |
| QO-FL-08 | Enviar e-mail | Status `enviado` ou equivalente; destinatário do cadastro/snapshot | | |

## Pesos-padrão

| ID | Passo | Esperado | Resultado | Evidência |
|----|-------|----------|-----------|-----------|
| QO-FL-09 | Coleta de pesos → certificado | Itens calculados; mesmo ciclo 04–07 | | |
| QO-FL-10 | Voz (se CC-PR72 vigente) | Valores ditados coincidem com os gravados | | |

## Papéis

| ID | Passo | Esperado | Resultado | Evidência |
|----|-------|----------|-----------|-----------|
| QO-FL-11 | Utilizador só coleta tenta emitir | Erro de permissão (RPC/RLS) | | |
| QO-FL-12 | Utilizador doutro tenant | Sem visibilidade dos registros | | |

**Critério:** QO-FL-01…07, 09, 11–12 Pass. QO-FL-08 e 10 conforme âmbito do ensaio.

## Desvios

| Desvio | Impacto | Ação | Fecho |
|--------|---------|------|-------|
| | | | |
