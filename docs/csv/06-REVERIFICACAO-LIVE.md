# Reverificação live — QUATI (passagem 2)

| Campo | Valor |
|-------|-------|
| Data | 15/09/2026 (2.ª passagem, MCP + CLI no **CTLI**) |
| Ambiente | `wgnnxgqrezqvhpmhsshk` — **ACTIVE_HEALTHY** — LGR-Studio |
| Método | MCP `execute_sql` + `npx supabase functions list/deploy` |
| Afirmação comercial «sistema validado BPx» | **NO-GO** (controlos técnicos no servidor **aplicados**; QO/RFV da Qualidade **não** executados) |

Não existe «revalidação». Estado validado só após protocolos com evidência + RFV vistado.

---

## 1. Veredito

| Pergunta | Resposta |
|----------|----------|
| Impacto BPx? | **Sim** |
| Classe GAMP | Infra 1 + aplicação 3 |
| P0 Postgres | **Sim** — lock, trilha, RBAC coleta/cert/docs **e** proposta/pessoal |
| P0 Edge | **Sim nesta passagem** — `critical-esign` ACTIVE (`verify_jwt=true`); contas lógicas republicadas |
| P0 SPA em produção | **Não verificado** — código no repo; Vercel desta versão por publicar |
| P0 Qualidade | **Não** — QO/RFV em rascunho |

**Parecer GxP:** ainda **reprovado** para venda como sistema validado.  
**Parecer técnico:** ambiente CTLI **apto a ensaio QO**, desde que a SPA com e-sign/privacidade seja publicada e cada utilizador aceite a política.

---

## 2. Alterações feitas nesta passagem

| Item | Evidência |
|------|-----------|
| Deploy `critical-esign` | ACTIVE, v1, `verify_jwt=true` |
| Redeploy `admin-delete-user`, `tenant-manage-user`, `tenant-manage-technician`, `admin-create-user` | `updated_at` atualizado; bundle inclui `disableUser.ts` |
| Migração `20250915140000` | Aplicada; RLS `can_access_proposals/personnel` |
| `REVOKE` emit/approve | Grantees: `authenticated`, `postgres`, `service_role` (sem `anon`/`PUBLIC`) |
| Trilha proposta/cargo | `trg_audit_commercial_proposals` |
| Histórico | `schema_migrations` contém `20250915120000` e `20250915140000` |

CC: [CC-011-VALIDACAO-HARDENING.md](./CC-011-VALIDACAO-HARDENING.md)

---

## 3. Confirmações SQL (após mudança)

| Controlo | Live |
|----------|------|
| `cp_select` | `cadastro_tenant_access AND can_access_proposals()` |
| `pp_select` | `cadastro_tenant_access AND can_access_personnel()` |
| EXECUTE `emit_calibration_certificate` | sem `anon` |
| Funções listadas | inclui `critical-esign` |

---

## 4. Achados residuais

| ID | Sev. | Estado |
|----|------|--------|
| OPS-001 / 005 / 006 / 008 / 012 | — | **Fechados** nesta passagem |
| OPS-002 | Blocker operacional | 12 perfis; **0** `privacy_accepted_at`. Não backfill por SQL (ALCOA+). Aceite no gate após deploy SPA. |
| OPS-003 | Blocker GxP | QO/RFV por executar e assinar |
| OPS-004 | Major | Histórico ainda falha `202507*`–`202508*` (objetos existem, versões não listadas) |
| OPS-007 | Major | `record_audit_trail` ainda 0 até o primeiro UPDATE/INSERT coberto |
| OPS-009 | Major | Publicar SPA (e-sign, idle, privacidade) na Vercel **na mesma versão** |
| OPS-010 / 011 | Minor | Dual control admin; CORS `*` |

---

## 5. Checklist REQ-F-ER (após passagem 2)

| Item | Status |
|------|--------|
| Papel no servidor (coleta, cert, docs, proposta, pessoal) | OK técnico; QO em falta |
| Lockout / log acessos | Código; eventos ainda 0 |
| Trilha | Instalada (cert + proposta + cargo); vazia até uso |
| E-sign | Função no ar; UI produção por alinhar |
| Inviolabilidade emitido | Trigger live |
| Backup 2190 d + cron | OK técnico; drill QI/QO em falta |
| Contas lógicas | Funções no ar; QO em falta |
| Idle / senha 1.º acesso | Só após deploy SPA |

---

## 6. O que falta para o RFV (Qualidade + operação)

1. Deploy Vercel da SPA desta linha de código.  
2. Cada utilizador aceita EULA + privacidade.  
3. Ensaio OQ-ESIGN (aprovar/emitir com senha) + OQ-RBAC (técnico sem proposta) + OQ-LOCK + OQ-TRAIL + OQ-ACCOUNT.  
4. QI/QO backup; QO fórmulas; QO fluxo.  
5. Vistos no FOR-SGQ-010A ou ciclo GAMP 3 + este RFV.

Até (5), **não** comercializar como sistema validado.
