# Plano de Validação (PV) — QUATI

**Documento:** rascunho DevSistem (15/09/2026). Não é PV aprovado.  
**Não usar** o termo “revalidação”: o estado validado mantém-se por **mudança controlada** + **revisão periódica**.

## 1. Introdução e escopo

Validação **prospectiva** do produto QUATI (Classe 3) para uso em laboratório de calibração com impacto BPx. Infra Vercel/Supabase = GAMP 1 (qualificar instalação/configuração, não o código da plataforma).

## 2. Visão geral

SPA React + Postgres RLS + Edge Functions. Fluxo crítico: proposta → coleta → cálculo → aprovação e-sign → emissão e-sign → e-mail.

## 3. Responsabilidades

| Papel | Responsabilidade |
|-------|------------------|
| Dono do sistema (CTLI) | Processo, dados mestres, aceite comercial |
| Elaborador (DevSistem) | Código, rascunhos, evidências de desenvolvimento |
| Qualidade | Aprovar ERU/riscos/PV/protocolos/RFV; vistos no papel |
| TI / Admin | Deploy migrações, secrets, backup drill |

## 4. Estratégia

- Risco: FMEA SIPOC; testes priorizados por NR.  
- FOR-SGQ-010A **prevalece** se a Qualidade o adotar; até lá, ciclo GAMP 3 (QI/QO/QD + matriz).  
- Aceite por estágio: QI (instalação) → QO (controlos e fórmulas) → QD amostral em operação (P2).  
- Fornecedor: CTLI (software) + Supabase/Vercel (infra).  
- Mudanças pós-go-live: CC com impacto BPx; atualizar matriz e testes afetados.

## 5. Documentos por etapa

Inventário, ERU, riscos, este PV, EF informal (`docs/00`–`10`), FOR-SGQ-010A rascunho, QI/QO backup, QO fórmulas, QO fluxo, matriz, RFV.

## 6. Critérios de aceitação (go-live GxP)

1. Migração `20250915120000_bpx_electronic_controls.sql` aplicada.  
2. Edge Function `critical-esign` publicada (`verify_jwt = true`).  
3. OQ de RBAC, lock, e-sign, trilha, lockout, idle, contas lógicas — **Pass** com evidência.  
4. QO fórmulas e QO proposta-coleta-cert — **Pass**.  
5. Drill QI/QO backup (`docs/11`) — **Pass**.  
6. Matriz sem REQ regulatório órfão.  
7. RFV assinado pela Qualidade.

Até (6)–(7), o produto **não** pode ser comercializado como sistema validado.

## 7. Desvios e cronograma

Desvios registados no protocolo. Cronograma: a preencher pela Qualidade após aprovação deste rascunho.
