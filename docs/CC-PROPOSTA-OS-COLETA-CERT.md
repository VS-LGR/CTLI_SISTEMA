# Controle de Mudança — Proposta/OS → Coleta pré-preenchida → Certificado

| Campo | Valor |
|-------|-------|
| Sistema | Frontend CTLI — propostas comerciais, coletas RE-7.2A / RE-5.4.2A, certificados |
| Tipo | Planejada |
| Escopo BPx | Rastreabilidade comercial → campo → certificado (ALCOA+: cabeçalho confirmado, leituras atribuídas, conferência) |
| Classificação | Software Classe 3 (customizado) |

## 1. Descrição

1. Itens de pesos-padrão na proposta (`commercial_proposal_weight_items`) + FKs em `weight_calibration_collections`.
2. **Tipo exclusivo:** cada proposta é **só balanças** ou **só pesos-padrão** (UI + validação; não misturar).
3. Geração unificada de coletas (1 por item) com pré-preenchimento de cliente/equipamento/nominais.
4. UI técnico: cabeçalho/nominais em somente leitura quando vinculados à proposta; foco em TBH + leituras; navegação por secções e cartões de leitura.
5. Voz (pesos): fase confirma cabeçalho → depois TBH/ABA.
6. Avisos (toast + `dashboard_reminders`) ao marcar preenchida/conferida; badges na proposta.
7. Cross-refs Proposta / O.S. / Certificado em PDFs e listagens.

## 2. Docs/testes afetados

- Migration: `20250807140000_proposal_weight_items_and_coleta_fks.sql`
- QO sugerido: gerar coletas a partir de proposta com balança+peso; técnico só edita leituras; voz confirma cabeçalho; PDF cert mostra proposta/OS; badge status na proposta.

## 3. Fora de escopo

Multi-tenant entre empresas; tolerâncias ambientais automáticas; rename RE-5.4.2↔RE-7.2.
