# CC-010 — Controlos eletrónicos BPx (código)

**Documento:** rascunho de controlo de mudança DevSistem (15/09/2026). Sem visto da Qualidade.  
**Mudança:** implementar no servidor os controlos que estavam só na UI (parecer comercial NO-GO).

## Descrição e motivo

Vender como sistema validado exige RBAC, lock de certificado, e-sign, trilha old/new, contas lógicas, lockout/idle e retenção de backup **no servidor**.

## Impacto BPx

Alto — certificados, coleta, documentos vigentes, identidade de utilizadores, ALCOA+.

## Artefactos

| Item | Local |
|------|--------|
| Migração | `supabase/migrations/20250915120000_bpx_electronic_controls.sql` |
| Edge Function | `supabase/functions/critical-esign/` (`verify_jwt = true`) |
| Contas | `_shared/disableUser.ts` (ban + `is_disabled`) |
| UI | `ESignProvider`, `IdleSessionGuard`, `MustChangePasswordGate`, gate EULA+privacidade |
| Docs a atualizar | ERU, riscos, matriz, FOR-SGQ-010A, QI/QO backup, este CC |

## Testes afetados

OQ-RBAC, OQ-LOCK, OQ-ESIGN, OQ-TRAIL, OQ-ACCOUNT, OQ-IDLE, OQ-LEGAL, QI/QO-BACKUP.

## Aprovação

| Papel | Data | Visto |
|-------|------|-------|
| Dono | | |
| Qualidade | | |
