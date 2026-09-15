# FOR-SGQ-010A — Validação de Sistemas Computadorizados

- **Documento:** rascunho DevSistem (não substitui o registo controlado da Qualidade)
- **Resultado do impacto BPF:** **IMPACTA**
- **Sistema:** QualiProc / ProcVault QMS `0.1.0`
- **Data:** 15/09/2026

Se a Qualidade adotar este formulário no SGQ, **ele prevalece** sobre o ciclo GAMP Classe 3 genérico. Até ser impresso, vistado e arquivado no FOR controlado, permanece rascunho.

## 1 – Identificação do sistema

| Campo | Valor |
| --- | --- |
| Nome | QualiProc (ProcVault QMS) |
| Versão | 0.1.0 |
| Tipo | Legado / já desenvolvido (validação prospectiva de produto) |
| Tela principal | `/dashboard` + editores de coleta e certificado |

## 2 – Verificação se o sistema impacta nas BPF

Legenda: I = impacta · NI = não impacta.

| Questão | Coleta/Cert | Docs/SGQ | Cadastros | Admin |
| --- | --- | --- | --- | --- |
| O sistema armazena dados que impliquem na rastreabilidade de produtos? | I (item/certificado) | NI | I (equipamento) | NI |
| Cadastramento de matérias-primas, embalagens, lotes? | NI | NI | NI | NI |
| Planejamento de produção? | NI | NI | NI | NI |
| Compras de materiais / fornecedores qualificados? | NI | NI | I (PR-6.6) | NI |
| Recebimento de materiais? | NI | NI | I | NI |
| Armazenamento de materiais? | NI | NI | NI | NI |
| Central de pesagem? | NI | NI | NI | NI |
| Controle de produção? | NI | NI | NI | NI |
| SAC / reclamações / eventos adversos? | NI | NI (só pasta) | NI | NI |
| Documentação controlada? | NI | I (PR-8.3) | NI | NI |
| Sistemas da qualidade (resultados analíticos / certificados)? | I | I | NI | NI |
| Programa de treinamento? | NI | NI | I (PR-6.2) | NI |
| Equipamentos (manutenção, calibração, qualificação)? | I | NI | I (RE-6.4) | NI |

**Qualquer I ⇒ validar.** Fora de escopo: produção, HVAC/WFI, formulação, MRP/MES.

## 3 – Requisitos do sistema

Necessidades: ver [01-ERU.md](./01-ERU.md) (REQ-U-001…016 e REQ-F-ER-001…007).

Controlos eletrónicos: ver [CC-010-CONTROLOS-ELETRONICOS.md](./CC-010-CONTROLOS-ELETRONICOS.md).

## 4 – Análise dos riscos

Ver [02-ANALISE-RISCOS.md](./02-ANALISE-RISCOS.md). NR = S×O×D; limiar 256.

## 5 – Validação do sistema

Desafios entrada/saída: [QO-FORMULAS.md](./QO-FORMULAS.md) e [QO-PROPOSTA-COLETA-CERT.md](./QO-PROPOSTA-COLETA-CERT.md). Cálculos com prova manual + regressão Jest como evidência de **desenvolvimento**, não como protocolo executado.

Campos de execução (em branco até o ensaio):

| ID | Entrada | Saída esperada | Resultado | Evidência |
|----|---------|----------------|-----------|-----------|
| DES-01 | | | | |
| DES-02 | | | | |

## 6 – Aprovações

| Papel | Nome | Função | Data | Visto |
| --- | --- | --- | --- | --- |
| Dono do sistema | | | | (papel) |
| Elaborador / Qualidade | | | | (papel) |

## 7 – Histórico de alterações

| Revisão | Data | Descrição |
| --- | --- | --- |
| 00 | 15/09/2026 | Edição inicial (rascunho DevSistem) |

Retenção: mínimo 6 anos após descontinuidade do sistema.  
Referências: Guia ANVISA CSV (2010); SIPOC; FMEA.
