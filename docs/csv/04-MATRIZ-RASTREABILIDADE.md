# Matriz de rastreabilidade — ProcVault QMS

**Documento:** rascunho DevSistem (15/09/2026). Execução dos TEST = campos em branco até o protocolo corrido.

| REQ | Descrição | RISK | DES | TEST | Criticidade | Estado |
|-----|-----------|------|-----|------|-------------|--------|
| REQ-U-001 | Isolamento tenant + log admin | RISK-003 | RLS `cadastro_tenant_access`; `admin_sensitive_actions` | OQ-ADMIN | Reg. | Código; QO por executar |
| REQ-U-002 | RBAC servidor | RISK-002 | `can_access_*` (coleta, cert, docs, **propostas, pessoal**) | OQ-RBAC | Reg. | **Live CTLI 15/09/2026**; QO por executar |
| REQ-U-003 / REQ-F-ER-006 | Lock emitido | RISK-011 | Trigger lock + `bpx.allow_locked_update` | OQ-LOCK | Reg. | Código; QO por executar |
| REQ-U-004 | E-sign no ato | RISK-004 | `critical-esign` + RPC | OQ-ESIGN | Reg. | **Função ACTIVE no CTLI** (`verify_jwt=true`); QO + deploy SPA por executar |
| REQ-U-005 / REQ-F-ER-004 | Audit trail old/new | RISK-010 | `bpx_audit_row_change` | OQ-TRAIL | Reg. | Código; QO por executar |
| REQ-U-006 | Contas lógicas | RISK-012 | `disableAuthUser` | OQ-ACCOUNT | Reg. | **Funções republicadas no CTLI**; QO por executar |
| REQ-U-007 / REQ-F-ER-002/003 | Lockout + log + idle | RISK-014 | RPCs login + `IdleSessionGuard` | OQ-IDLE | Reg. | Código; QO por executar |
| REQ-U-008 | Senha 1.º acesso | — | `must_change_password` | OQ-PWD | Reg. | Código; QO por executar |
| REQ-U-009 | Aceite legal servidor | RISK-015 | `accept_legal_terms` | OQ-LEGAL | Reg. | Código; QO por executar |
| REQ-U-010 / REQ-F-ER-007 | Backup 2190 d | RISK-013 | `tenant-backup` | QI/QO-BACKUP | Reg. | Código; drill por executar |
| REQ-U-011 | Fórmulas | RISK-001 | `certificateCalculations` | QO-FORMULAS | Imp. | Jest; QO Qualidade por executar |
| REQ-U-012 | Numeração única | — | unique ativo | OQ-NUM | Imp. | Código existente |
| REQ-U-013 | Snapshot emissão | — | RPC emit fields | OQ-ESIGN | Reg. | Código; QO por executar |
| REQ-U-014 | PDF | — | `certificatePdf` | QO-PDF | Imp. | Dev; QO amostral |
| REQ-U-015 | Fluxo ponta a ponta | — | proposta/coleta/cert | QO-FLOW | Imp. | QO-PROPOSTA-COLETA-CERT |
| REQ-U-016 | DOCX vigente | RISK-005 | trigger vigente | OQ-DOCS | Reg. | Código; QO por executar |
| REQ-F-ER-001 | Autorização servidor | RISK-002 | RLS papel | OQ-RBAC | Reg. | Live coleta/cert/docs/proposta/pessoal; QO por executar |
| REQ-F-ER-005 | Export | — | backup/PDF | QI-BACKUP / QO-PDF | Imp. | Parcial |

**Gaps (bloqueiam RFV):** todas as colunas TEST sem evidência de execução e visto Qualidade. Jest **não** substitui QO.
