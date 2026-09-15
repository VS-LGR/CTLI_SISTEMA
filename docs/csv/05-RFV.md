# Relatório final de validação (RFV) — pré-execução

**Documento:** rascunho DevSistem (15/09/2026). **Conclusão atual: NÃO VALIDADO.**

## 1. Identificação

QUATI `0.1.0`. Dono: CTLI.

## 2. Âmbito executado

Entregues **rascunhos** de inventário, ERU, riscos, PV, matriz, FOR-SGQ-010A e protocolos QO.  
Controlos P0 **no Postgres e Edge do CTLI** (15/09/2026): RLS por papel, lock, trilha, `critical-esign` ACTIVE, contas lógicas, endurecimento `20250915140000`.

**Não executado:** QI/QO/QD com evidências e vistos GQ; drill de backup; QO de fórmulas e fluxo; deploy da SPA desta versão na Vercel; aceite de privacidade pelos 12 perfis.

## 3. Desvios

Nenhum protocolo oficial corrido — desvios N/A até execução.

## 4. Conclusão

O sistema **não** se encontra em estado validado. É **proibido** comercializar com a afirmação “sistema computadorizado validado / apto a BPx” até:

1. Publicar a SPA (e-sign/privacidade) e obter aceite dos utilizadores.  
2. Executar e aprovar OQ-RBAC, OQ-LOCK, OQ-ESIGN, OQ-TRAIL, OQ-ACCOUNT, OQ-IDLE, QI/QO-BACKUP, QO-FORMULAS, QO-FLOW.  
3. Fechar gaps da matriz (coluna TEST).  
4. Assinar este RFV (versão congelada) pela Qualidade.

| Papel | Nome | Data | Visto |
|-------|------|------|-------|
| Dono do sistema | | | (papel) |
| Elaborador | | | (papel) |
| Qualidade | | | (papel) |

Revisão 00 — rascunho inicial. Retenção: ≥ 6 anos após descontinuidade.
