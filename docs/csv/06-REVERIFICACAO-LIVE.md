# Reverificação live — ProcVault QMS / QualiProc

| Campo | Valor |
|-------|-------|
| Data | 15/09/2026 |
| Ambiente | Supabase **CTLI** (`wgnnxgqrezqvhpmhsshk`, `sa-east-1`, **ACTIVE_HEALTHY**) — org ligada no CLI (LGR-Studio) |
| Método | CLI `supabase db query --linked` + `functions list` (não MCP) |
| Código local | SPA `0.1.0` + migração `20250915120000` + Edge `critical-esign` (ainda **não** publicada) |
| Afirmação comercial «sistema validado BPx» | **NO-GO** |
| Uso interno do laboratório | Condicionado ao plano P0 de deploy (ver abaixo) |

**Nota de conexão:** o MCP do Cursor estava no projeto **Hirely** (`hgmsyhvrwagwbfizjaye`, inativo). Esta verificação usou o projeto **CTLI** já `linked` no CLI, que está saudável.

Não existe «revalidação»: o estado validado só nasce depois de protocolos executados + RFV com vistos da Qualidade, e mantém-se por mudança controlada + revisão periódica.

---

## 1. Veredito

| Pergunta | Resposta |
|----------|----------|
| Impacto BPx? | **Sim** — rastreabilidade, certificados (resultados), documentação controlada, treino, equipamentos, compras. |
| Classe GAMP | Infra **1** (Vercel/Supabase) + aplicação **3** (customizada). |
| Controlos P0 no **Postgres CTLI**? | **Sim (código SQL presente)** — RLS por papel em coleta/certificado/DOCX, lock, trilha, RPCs com `auth.uid()`, retenção 2190 d, cron de backup. |
| Controlos P0 **operacionais** (funções + UI + Qualidade)? | **Não** — `critical-esign` ausente; 0/12 perfis com privacidade; trilha vazia; dossiê sem vistos; histórico de migrações incompleto. |

**Parecer:** **Reprovado** para claim GxP. **Não promover** o frontend novo sem o plano P0-A (senão aprovação/emissão quebram).

---

## 2. O que o banco CTLI já tem (evidência)

| Controlo | Estado live |
|----------|-------------|
| Colunas `profiles.is_disabled`, `must_change_password`, `privacy_accepted_*`, `failed_login_count` | Existem |
| Tabelas `record_audit_trail`, `auth_access_events`, `admin_sensitive_actions` | Existem (**0 linhas** cada) |
| Funções `can_approve_certificates`, `emit_calibration_certificate`, `login_is_blocked`, `legal_acceptance_ok`, `certificate_status_is_locked` | Existem |
| RLS certificados | SELECT/UPDATE exigem `can_access/edit_certificates()`; DELETE = `false` |
| RLS coleta | `can_access/edit_coleta()`; DELETE só sem `certificate_id` |
| RLS `tenant_documents` | UPDATE/DELETE exigem `can_manage_master_documents()` |
| Triggers em `calibration_certificates` | `trg_lock_*` + `trg_audit_*` |
| RPC `approve_calibration_certificates` | Ator = `auth.uid()`; exige papel + `legal_acceptance_ok()` |
| `tenants.backup_retention_days` | **2190** nos 4 tenants |
| Cron `tenant-backup-auto-daily` | `0 3 * * *` → `invoke_tenant_backup_auto()` |
| Certificados de balança | 14 `calculado`, 1 `enviado` |

---

## 3. Achados (o que precisa alterar)

| ID | Sev. | Área | Evidência | Impacto | Correção |
|----|------|------|-----------|---------|----------|
| OPS-001 | **Blocker** | Deploy Edge | `functions list`: **não há** `critical-esign`. `admin-delete-user` e `tenant-manage-technician` sem update recente (código local já desativa, produção pode ainda apagar). | Frontend novo **não consegue** aprovar/emitir. Lock no banco **já impede** UPDATE de certificado `aprovado\|emitido` sem GUC da RPC. | Publicar funções (plano P0-A). |
| OPS-002 | **Blocker** | Aceite legal | 12 perfis; **1** com EULA; **0** com `privacy_accepted_at`. RPC recusa emitir/aprovar sem os dois. | Go-live do e-sign = ninguém assina. | Aceite no gate (plano P0-B). |
| OPS-003 | **Blocker** | CSV / Qualidade | `docs/csv/*` rascunho; QO backup/fórmulas/fluxo **não executados**; RFV diz não validado. | Claim comercial GxP ilegal/indevido. | Executar dossiê (plano P0-C). |
| OPS-004 | **Major** | Histórico de schema | `supabase_migrations.schema_migrations` **para em 20250630**. Repo tem ~50 ficheiros `202507*`–`20250915`. Objetos **existem**, mas o inventário de versão está mentiroso. | Auditoria não prova o que está instalado. | Reparar histórico (plano P1-A). |
| OPS-005 | **Major** | Contas | Funções de delete **não republicadas** após desativação lógica. | Risco de exclusão física / reutilização de ID. | Redeploy `admin-delete-user`, `tenant-manage-*`. |
| OPS-006 | **Major** | RBAC residual | `commercial_proposals` e `personnel_positions`: RLS **só** `cadastro_tenant_access` (qualquer user do tenant). | Técnico pode alterar proposta/treino via API. | RLS por papel (plano P1-B). |
| OPS-007 | **Major** | Trilha | Triggers OK, **0 eventos**. Nenhum desafio QO. | Sem evidência ALCOA+ em operação. | Ensaio OQ-TRAIL (plano P0-C). |
| OPS-008 | **Major** | Grants | `EXECUTE` de RPCs críticas também em **PUBLIC/anon** (a função exige `auth.uid()`, mas a superfície é larga). | Superfície de ataque / advisors futuros. | `REVOKE` de `anon`/`PUBLIC` em emit/approve (plano P1-C). |
| OPS-009 | **Major** | Frontend vs banco | Código e-sign/idle/privacidade está no working tree; produção Vercel **não verificada** nesta passagem. | Drift: UI antiga + lock SQL, ou UI nova sem função. | Deploy **conjunto** (plano P0-A). |
| OPS-010 | **Minor** | Admin cross-tenant | Tabela `admin_sensitive_actions` vazia; sem dual control. | Risco médio (RISK-003). | P2. |
| OPS-011 | **Minor** | CORS `*` nas Edge | Padrão atual das funções. | Não é o buraco de ACL, mas é fraco. | Restringir origem (P2). |
| OPS-012 | **Informativo** | MCP Cursor | Ligado a Hirely, não CTLI. | Auditorias futuras no sítio errado. | Reautenticar MCP em LGR-Studio → CTLI. |

---

## 4. Checklist eletrónico (REQ-F-ER) — live

| Item | Status | Nota |
|------|--------|------|
| Autorização por papel no servidor (coleta/cert/docs) | Parcial | OK nesses módulos; **gap** em proposta e pessoal |
| Tentativas + bloqueio | Código no DB | `login_is_blocked` existe; `auth_access_events` = 0 (sem uso ainda) |
| Log de acessos | Gap operacional | Tabela vazia |
| Trilha old/new | Instalada, vazia | Precisa QO |
| E-sign no ato | Gap de **deploy** | SQL+UI no repo; função não publicada |
| Inviolabilidade emitido | SQL OK | Trigger live; emissão precisa da RPC |
| Backup + retenção 6 anos | Parcial | 2190 d + cron; QI/QO `docs/11` **não executado** |
| Contas lógicas | Gap de **deploy** | Código local; funções antigas no ar |
| Logout idle / senha 1.º acesso | Só no código da SPA | Depende do deploy frontend |
| POP de acessos / e-sign | Gap | Qualidade |

---

## 5. Planos de ação

### P0-A — Deploy acoplado (TI / Admin CTLI) — **antes** de qualquer utilizador usar o frontend novo

**Objetivo:** UI e servidor falarem a mesma língua.

1. No projeto **CTLI** (não Hirely): aplicar/confirmar `20250915120000` (já parece aplicada via SQL; **registar** no histórico — ver P1-A).
2. Publicar Edge Functions:
   ```bash
   npx supabase functions deploy critical-esign --project-ref wgnnxgqrezqvhpmhsshk
   npx supabase functions deploy admin-delete-user admin-create-user tenant-manage-user tenant-manage-technician --project-ref wgnnxgqrezqvhpmhsshk
   ```
   `critical-esign` deve ficar com `verify_jwt = true` (`supabase/config.toml`).
3. Deploy Vercel **da mesma commit** que contém `ESignProvider` + `emitCertificate` via `critical-esign`.
4. Fumaça: login → aceite privacidade → aprovar um certificado de ensaio **com senha** → emitir → confirmar linha em `calibration_certificate_reviews` (`emissao`) e em `record_audit_trail`.

**Critério de fecho:** `functions list` inclui `critical-esign` ACTIVE; um ciclo aprovar+emitir com e-sign passa; UPDATE direto a certificado emitido falha.

**Responsável:** TI. **Aprovação:** Dono + Qualidade se o ambiente já tiver dados oficiais.

---

### P0-B — Aceite de privacidade (Operação)

**Objetivo:** `legal_acceptance_ok()` verdadeiro para quem emite.

1. Garantir rota `/privacidade` e gate (EULA + privacidade) no frontend publicado.
2. Cada utilizador ativo entra e aceita (12 contas; hoje 0 privacy).
3. Confirmar: `SELECT count(*) FILTER (WHERE privacy_accepted_at IS NOT NULL) FROM profiles;` = contas ativas.

**Responsável:** Admin do tenant / RH. **Não** fazer aceite «por SQL» em nome do utilizador (ALCOA+).

---

### P0-C — Dossiê e QO (Qualidade) — bloqueia o claim comercial

**Objetivo:** passar de rascunho DevSistem a registo controlado.

1. Qualidade decide: **FOR-SGQ-010A** (prevalece) **ou** ciclo GAMP 3 completo.
2. Imprimir/arquivar: inventário, ERU, riscos, PV, matriz (`docs/csv/`).
3. Executar com evidência (capturas + SQL):
   - OQ-RBAC, OQ-LOCK, OQ-ESIGN, OQ-TRAIL, OQ-ACCOUNT, OQ-IDLE
   - QI/QO backup (`docs/11-BACKUP-DR-QIQO.md`)
   - QO fórmulas e QO proposta→coleta→cert
4. RFV com vistos. Até aqui, **não** vender como validado.

**Responsável:** Qualidade + dono. Elaborador só apoia evidência.

---

### P1-A — Inventário de versão (TI)

1. Comparar `supabase/migrations/*.sql` com objetos live.
2. Inserir em `supabase_migrations.schema_migrations` as versões **já materializadas** (sem reexecutar DDL).
3. Congelar a versão npm + hash git no RFV.

---

### P1-B — RBAC restante (Produto)

RLS por papel em **propostas** e **pessoal** (hoje qualquer user do tenant). Ligar a `access_acl` / papéis já usados na UI.

**Testes:** OQ extra; atualizar matriz REQ-U-002.

---

### P1-C — Endurecer RPCs (Produto)

```sql
REVOKE ALL ON FUNCTION public.emit_calibration_certificate(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_calibration_certificates(uuid[], uuid, text) FROM PUBLIC, anon;
-- repetir para emit/approve de pesos
GRANT EXECUTE ON FUNCTION ... TO authenticated;
```

---

### P1-D — Contrato LGPD

Assinar DPA com o cliente (`docs/csv/LGPD-DPA.md` é rascunho). Minimizar CPF/RG.

---

### P2

- Dual control em ações admin cross-tenant.
- CORS restrito.
- Ligar DOCX vigente à revisão da lista mestra (além do trigger).
- QD amostral em operação real.

---

## 6. Ordem obrigatória (não inverter)

```text
P0-A (deploy conjunto) → P0-B (aceites) → fumaça e-sign
        ↓
P0-C (protocolos + RFV)  ← único caminho para claim GxP
        ↓
P1-A/B/C/D → P2
```

Publicar **só** o frontend novo **sem** `critical-esign` = emissão/aprovação falham.  
Deixar o frontend antigo **com** o lock SQL já live = emissão por UPDATE direto **já falha** em certificados `aprovado`+.

---

## 7. Fora de escopo (inalterado)

Produção farmacêutica, pesagem de formulação, comando de equipamento. Pastas PR-7.9 / 7.10 / 8.7 sem workflow.

---

## 8. Próximo passo imediato

1. Reautenticar o MCP Supabase do Cursor em **LGR-Studio → CTLI** (deixar de usar Hirely).
2. Executar **P0-A** no projeto CTLI.
3. Só depois marcar ensaio de QO na agenda da Qualidade.
