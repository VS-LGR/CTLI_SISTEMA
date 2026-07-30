# Protocolo QI/QO — Backup & Disaster Recovery (tenant)

**Código sugerido:** QI/QO-BACKUP-DR  
**Sistema:** ProcVault / Lista Mestra + cadastros (impacto BPx)  
**Classificação:** Software Classe 3 (export/restore customizado)  
**Camadas:**  
1. **DR de plataforma** — PITR / backups do projeto Supabase (infra).  
2. **Export tenant** — Edge Function `tenant-backup` (ZIP Storage + SHA-256 + audit trail).

Este protocolo valida a **camada 2** (export/restore por ambiente). A camada 1 deve constar do inventário de infra e do contrato Supabase.

---

## 1. Objetivo

Demonstrar que é possível:
- Gerar backup completo e íntegro (SHA-256 / `integrity.json`)
- Analisar impacto sem gravar (**dry-run**)
- Restaurar com rastreabilidade (ator, modo, hash)
- Em replace: reautenticar + gerar **pre-replace** automático

---

## 2. Pré-requisitos

| Item | Critério |
|------|----------|
| Papel | Utilizador `admin` CTLI |
| Migrations | Inclui `20250730010000`, `20250730020000`, `20250730030000`, `20250730100000` (auto 90d) |
| Edge Function | `tenant-backup` deployada (manifest v3+; auth cron `BACKUP_CRON_SECRET`) |
| Ambiente de teste | Tenant de ensaio (não produção, salvo drill aprovado) |
| Evidências | Screenshots + export de `tenant_backup_events` + hash do ZIP |
| Cron (prod) | Extensões `pg_cron`/`pg_net`; settings `tenant_backup_function_url` + `backup_cron_secret` |

---

## 3. QI — Qualificação de Instalação

| ID | Passo | Esperado | Evidência |
|----|-------|----------|-----------|
| QI-01 | Bucket `tenant-backups` existe, privado, limite ≥ 500 MiB | OK | Dashboard Storage |
| QI-02 | Tabela `tenant_backup_events` existe; RLS sem update/delete autenticado | OK | SQL / policies |
| QI-03 | Coluna `tenants.backup_retention_days` (default 90) e `auto_interval_days` (default 90) | OK | `\d tenants` / select |
| QI-04 | Função `tenant-backup` responde `action=list` com `storage_mode=storage_signed` | OK | Network / UI Backup |
| QI-05 | Segredo `CTLI_SERVICE_ROLE_KEY` configurado | OK | Edge Secrets |
| QI-06 | Segredo `BACKUP_CRON_SECRET` + job `tenant-backup-auto-daily` agendado | OK | Edge Secrets + `cron.job` |
| QI-07 | Settings DB `app.settings.tenant_backup_function_url` e `backup_cron_secret` | OK | `SHOW` / SQL |

**Critério de aceite QI:** todos QI-xx Pass.

---

## 4. QO — Qualificação de Operação (DR drill)

Ambiente: ____________  Data: ____________  Executor: ____________  Aprovador Qualidade: ____________

| ID | Passo | Esperado | Resultado | Evidência |
|----|-------|----------|-----------|-----------|
| QO-01 | Gerar e baixar backup **manual** | ZIP descarregado; evento `create` success `source=manual`; SHA-256 no toast/UI | | |
| QO-02 | Confirmar `integrity.json` no ZIP | Presente; digests por ficheiro | | |
| QO-03 | Dry-run do ZIP | Relatório sem gravação; evento `dry_run`; contagens ZIP vs live | | |
| QO-04 | Alterar 1 registo de teste no tenant | Alteração visível | | |
| QO-05 | Restore **merge** do ZIP anterior | Dados do ZIP reaparecem (novos IDs); evento `restore` merge | | |
| QO-06 | (Opcional / ensaio) Restore **replace** | Exige `SUBSTITUIR` + senha; evento `pre_replace_backup` + `restore` replace | | |
| QO-07 | Tentar replace com senha errada | 401; evento `reauth_fail`; dados intactos | | |
| QO-08 | Corromper 1 JSON no ZIP e dry-run/restore | Falha integridade; evento `verify_fail` | | |
| QO-09 | Verificar retenção | `backup_retention_days` documentado; purga não remove ZIPs recentes | | |
| QO-10 | Guardar cópia offsite | ZIP + hash em partilha/rede da empresa | | |
| QO-11 | Backup **automático** (ensaio) | Chamar create com `X-Backup-Cron` + secret **ou** `SELECT invoke_tenant_backup_auto()`; ZIP no Storage; evento `source=auto` | | |

**Critério de aceite QO:** QO-01…05, QO-07…08 e QO-10 Pass. QO-06 obrigatório em drill anual de replace. QO-11 obrigatório após ativar cron em produção.

---

## 5. Desvios

| Desvio | Impacto | Ação | Fecho |
|--------|---------|------|-------|
| | | | |

---

## 6. Conclusão

- [ ] Aprovado  
- [ ] Aprovado com ressalvas  
- [ ] Reprovado  

Assinaturas: Executor ____________  Qualidade ____________  Data ____________

---

## 7. Notas ALCOA+ / CSV

- **Atribuível:** `tenant_backup_events` (ator, email, role; `source=manual|auto`)  
- **Contemporâneo:** `created_at` no evento  
- **Original / íntegro:** SHA-256 + verify no restore  
- **Disponível:** Storage privado + cópia offsite SOP; auto a cada 90 dias  
- **Duradouro:** retenção 90 dias (purga) + arquivamento empresarial  

Mudanças futuras no módulo de backup exigem **controlo de mudanças** e reexecução dos QI/QO afetados.
