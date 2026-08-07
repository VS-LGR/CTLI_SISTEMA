# Controle de Mudança — Voz + alinhamento PR-7.2 Rev.06 (pesos)

| Campo | Valor |
|-------|-------|
| Sistema | Frontend CTLI — coleta/certificado de calibração de pesos-padrão (RE-5.4.2A/B) |
| Tipo | Planejada |
| Referência | PR-7.2 Calibração de Pesos, Rev. 06, emissão 17/07/24 |
| Norma | NBR ISO/IEC 17025:2017 (relato / acreditação RBC) |

## 1. Descrição da mudança

1. Alinhar defaults e textos da coleta/certificado de pesos ao PR-7.2 Rev.06 (método ABA, 5 ciclos por padrão, observações com método e 17025).
2. Adicionar entrada por voz (Web Speech API, pt-BR) para leituras de ciclo ABA e condições ambientais T/UR/P, com confirmação humana obrigatória (Confirmar / Refazer / Cancelar).

## 2. Motivo

Operação com luvas/pinças (§4 do PR-7.2) dificulta o teclado; defaults e textos do módulo não espelhavam o procedimento vigente.

## 3. Avaliação de impacto

| Aspecto | Impacto | Detalhe |
|---------|---------|---------|
| BPx / qualidade | Sim | Dados de calibração alimentam certificado |
| Integridade de dados | Sim (controlado) | Valor de voz só grava após Confirmar; teclado intacto; workflow conferida mantido |
| Segurança / acesso | Não | Mesmas permissões `canAccessColeta` |
| Interfaces | Não | Sem mudança de API de persistência |
| Infraestrutura | Não | Browser Web Speech (Chrome/Edge) |
| Documentação | Sim | Observações Lista Mestra RE-5.4.2B; migration SQL |

- Criticidade: Média
- Risco residual: STT incorreto mitigado por confirmação + conferência da coleta

## 4. Nota GQ — códigos de registro

O PR-7.2 §9 cita RE-7.2A/RE-7.2B. No sistema, pesos usam RE-5.4.2A/B e balanças usam RE-7.2A/B. **Não migrar códigos sem CC/Lista Mestra dedicado.**

## 5. Verificação QO sugerida (Chrome)

- [ ] Nova coleta: itens com 5 ciclos por padrão
- [ ] Rótulos P/M (ABA) na UI
- [ ] Modo campo a campo: ditar leitura, Confirmar / Refazer / Cancelar
- [ ] Modo sequência: ABA completo de um item + ambiente
- [ ] Browser sem suporte: mensagem e teclado operacional
- [ ] Salvar coleta e gerar certificado
- [ ] PDF/observações: método PR-7.2 Calibração de Pesos; RBC cita 17025:2017

## 6. Aprovações

| Papel | Nome | Data | Decisão |
|-------|------|------|---------|
| Dono do sistema | | | |
| TI | | | |
| Validação | | | |
| Garantia da Qualidade | | | |
