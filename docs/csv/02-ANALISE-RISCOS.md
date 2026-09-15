# Análise de riscos CSV — ProcVault QMS

**Documento:** rascunho DevSistem (15/09/2026). Não é FMEA aprovada nem FOR controlado.  
**Método (enquanto FOR-SGQ-010A não for adotado):** FMEA SIPOC, escalas pares 0–10, **NR = S × O × D**, limiar inaceitável **> 256**.  
**Após controlos P0 no servidor:** residual deve ser reavaliado na execução do protocolo.

| ID | Função | Perigo | Dano | S | O | D | NR | Controlo | Verificação | Residual pós-P0 |
|----|--------|--------|------|---|---|---|----|----------|-------------|-----------------|
| RISK-001 | Fórmulas no cliente | Erro de incerteza | Certificado incorreto | 8 | 4 | 4 | 128 | Jest + QO fórmulas | QO-FORMULAS | Médio — QO Qualidade |
| RISK-002 | Papel ignorado no RLS | Técnico altera cert alheio | Integridade | 10 | 8 | 4 | 320 | RLS/RPC `can_*` | OQ-RBAC | Alto pré-P0; **Baixo** se RLS aplicada |
| RISK-003 | Admin cross-tenant | Acesso indevido a outro lab | Confidencialidade | 8 | 4 | 6 | 192 | Log `admin_sensitive_actions` | OQ-ADMIN | Médio (P2 dual control) |
| RISK-004 | Aprovação sem e-sign | Ato não atribuível | ALCOA+ | 10 | 8 | 4 | 320 | `critical-esign` + RPC `auth.uid()` | OQ-ESIGN | Alto pré-P0; **Baixo** se deploy |
| RISK-005 | DOCX vigente editável | Procedimento adulterado | SGQ | 8 | 6 | 4 | 192 | Trigger / RLS `can_manage_master_documents` | OQ-DOCS | Médio |
| RISK-010 | Sem trilha old/new | Alteração não rastreável | ALCOA+ | 10 | 8 | 4 | 320 | `record_audit_trail` | OQ-TRAIL | Alto pré-P0; **Baixo** se trigger |
| RISK-011 | UPDATE após lock | Cert emitido mutável | Inviolabilidade | 10 | 8 | 4 | 320 | Trigger `certificate_status_is_locked` | OQ-LOCK | Alto pré-P0; **Baixo** se trigger |
| RISK-012 | Delete físico de conta | Reutilização de identidade | Atribuibilidade | 8 | 6 | 4 | 192 | `disableAuthUser` (ban + `is_disabled`) | OQ-ACCOUNT | Baixo pós-P0 |
| RISK-013 | Retenção 90 d | Perda de evidência | Disponibilidade | 8 | 4 | 6 | 192 | Default 2190 d | QI-BACKUP | Baixo pós-P0 |
| RISK-014 | JWT sem idle | Sessão abandonada | Acesso indevido | 6 | 6 | 6 | 216 | `IdleSessionGuard` 15 min | OQ-IDLE | Baixo |
| RISK-015 | Aceite só na UI | Tratamento PII sem base | LGPD | 8 | 6 | 4 | 192 | RPC `accept_legal_terms` + gate | OQ-LEGAL | Médio (DPA cliente) |

**Prioridade de testes:** RISK-002, 004, 010, 011 (NR>256 antes dos controlos) — OQ de RBAC, e-sign, trilha e lock.
