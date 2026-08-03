# Deploy (Vercel + Supabase)

Este repositório é o **sistema ProcVault completo** (interface React em `src/`, base de dados e Edge Functions em `supabase/`). O nome da pasta `frontend` é histórico; não depende de outro backend externo para cadastros, coleta, lembretes ou **documentos** (`tenant_documents` + bucket `tenant-documents`).

## Variáveis de ambiente no Vercel

Defina no painel do projeto Vercel (Settings → Environment Variables):

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `REACT_APP_SUPABASE_URL` | Sim (modo Supabase) | URL do projeto (Settings → API no Supabase). |
| `REACT_APP_SUPABASE_ANON_KEY` *ou* `REACT_APP_SUPABASE_PUBLISHABLE_KEY` | Sim (modo Supabase) | Chave **publicável** do painel (`anon` / JWT ou `sb_publishable_…`). Nunca expor `service_role`. |
| `REACT_APP_BACKEND_URL` | Opcional | API legada (importação/transição); **procedimentos e registros usam Supabase** quando `REACT_APP_SUPABASE_URL` + chave pública estão definidos. |
| `REACT_APP_USE_MOCK_API` | Opcional | `true` apenas para demo local sem Supabase nem API. |

### Backup (Edge Function `tenant-backup`) — Storage + URL assinada

O backup gera um `.zip` completo do tenant, grava-o no bucket privado **`tenant-backups`** e devolve uma **URL assinada** (1 h) para download. Guarde também uma cópia na rede da empresa. Para recuperar, faça **upload** do ZIP na UI.

**Modos:**
- **Automático (90 dias):** job `pg_cron` diário (`tenant-backup-auto-daily`, 03:00 UTC) chama a Edge Function para tenants com `last_backup_at` nulo ou mais antigo que `auto_interval_days` (default **90**). ZIP fica só no Storage (`source: auto`).
- **Manual:** botão «Gerar cópia» na UI (admin CTLI) — Storage + download local (`source: manual`).
- **Retenção / espaço:** `backup_retention_days` (default **90**) — ZIPs mais antigos são purgados em `list`/`create`.

Cobertura (manifest v3): cadastros, certificados, lista mestra, propostas, equipamentos, pedidos, anexos + **integrity.json** (SHA-256 por ficheiro).

Export é **paginado** (1000 linhas); se a contagem exportada ≠ `count` exacto, a criação falha (409) para evitar ZIP truncado.

**P1/P2:** audit trail `tenant_backup_events`; SHA-256 + verify; retenção; dry-run; replace com reauth + pre-replace automático. Protocolo: `docs/11-BACKUP-DR-QIQO.md`.

Segredos na Edge Function `tenant-backup`:

| Segredo | Obrigatório | Descrição |
|---------|-------------|-----------|
| `CTLI_SERVICE_ROLE_KEY` | Sim | Valor **service_role** (Settings → API). |
| `BACKUP_CRON_SECRET` | Sim (para auto) | Segredo partilhado com o job `pg_cron` (`Authorization: Bearer` + header `X-Backup-Cron: 1`). |
| `LEGACY_API_URL` | Opcional | API antiga de documentos. |
| `LEGACY_API_SERVICE_TOKEN` | Opcional | Token para export/restore legado no ZIP. |

Após aplicar a migração `20250730100000_tenant_backup_auto_90d.sql`, configurar uma vez no SQL Editor:

```sql
ALTER DATABASE postgres SET app.settings.tenant_backup_function_url =
  'https://SEU_REF.supabase.co/functions/v1/tenant-backup';
ALTER DATABASE postgres SET app.settings.backup_cron_secret = 'o-mesmo-valor-de-BACKUP_CRON_SECRET';
```

Ativar extensões **pg_cron** e **pg_net** (Database → Extensions) se ainda não estiverem ativas.

Migrações: `20250623000000`, `20250624000000`, `20250730010000`, `20250730020000`, `20250730030000`, **`20250730100000_tenant_backup_auto_90d.sql`**.

Após alterar a função: `supabase functions deploy tenant-backup`.

Acesso manual: **apenas role `admin`** (CTLI). Acesso automático: segredo `BACKUP_CRON_SECRET`.

O build usa `npm install --legacy-peer-deps && npm run build` (ver `vercel.json`).

### Aceite EULA / Licença (primeiro login)

Migração **`20250803140000_profiles_legal_acceptance.sql`**: colunas `profiles.legal_accepted_at` / `legal_accepted_version` + RPC `accept_legal_terms`. No primeiro acesso (ou se a versão dos termos mudar), a UI bloqueia o tutorial até o utilizador aceitar; recusar faz logout.

## Supabase (CLI)

1. Aplicar migrações SQL em `supabase/migrations/` ao projeto (Supabase SQL Editor ou `supabase db push` com o CLI ligado ao projeto).
2. Publicar **todas** as Edge Functions usadas pelo frontend (segredos automáticos `SUPABASE_URL`, `SUPABASE_ANON_KEY`; adicionar **`CTLI_SERVICE_ROLE_KEY`** em Dashboard → Edge Functions → Secrets):

```bash
supabase functions deploy admin-create-user admin-update-user admin-delete-user tenant-manage-technician tenant-backup
```

| Função | Uso |
|--------|-----|
| `admin-create-user`, `admin-update-user`, `admin-delete-user` | Utilizadores do ambiente (Admin → Ambientes) |
| `tenant-manage-technician` | Técnicos de campo (Cadastros → Técnicos de campo) |
| `tenant-backup` | Backup/restore ZIP por tenant |
3. **Primeiro administrador CTLI:** criar o primeiro utilizador em **Authentication** (ou convite). Na tabela `public.profiles`, garantir `role = 'admin'` e `tenant_id IS NULL` (por trigger com metadata, ou `UPDATE` manual no SQL Editor). Sem isto, **não** consegue inserir linhas em `tenants` nem gerir contas (RLS).

4. **Contas de portal:** utilize papel `client` (ou outros papéis com `tenant_id`) ao convidar utilizadores; o separador **Conta cliente (portal)** aparece no ecrã de criação de utilizadores quando o frontend está atualizado.

5. **Lembretes da dashboard:** aplicar `20250625000000_dashboard_reminders.sql` (tabela `dashboard_reminders` no Supabase — sem API legada).

6. **Cadastros e anexos:** aplicar também a migração `20250616000000_cadastros_multitenant.sql`, que cria tabelas de fornecedores, **clientes finais** (menu Cadastros → Clientes), colaboradores, certificados e o **bucket** privado `cadastro-certificados` com políticas RLS em `storage.objects`. O primeiro segmento do caminho do ficheiro deve ser o UUID do tenant (`{tenant_id}/weight|env/{cert_id}/{filename}`).

7. **Coleta RE-7.2A:** aplicar `20250618000000_scale_calibration_collections.sql` (papel `tecnico_campo` e tabela de coletas).

8. **Procedimentos e documentos (requisitos 4–8):** aplicar **`20250626000000_tenant_documents.sql`** — tabela `tenant_documents`, bucket privado `tenant-documents`, RLS. Sem esta migração, a listagem e o editor de documentos falham em modo Supabase.

## Resolução de problemas (criação de ambientes / utilizadores)

| Sintoma | Causa provável |
|---------|------------------|
| Erro de permissão / RLS ao criar ambiente | Sessão não é `profiles.role = 'admin'` ou env Supabase incorreto. |
| Criação de ambiente OK, falha ao criar utilizador | Edge Functions `admin-create-user` não deployadas ou falta `CTLI_SERVICE_ROLE_KEY` nos segredos. |
| `Failed to send a request to the Edge Function` ao criar técnico ou utilizador | Função não publicada no projeto (`tenant-manage-technician` não aparece no painel = falta deploy); confirmar `REACT_APP_SUPABASE_URL` aponta ao mesmo projeto. |
| Falha ao guardar técnico de campo | Deploy de `tenant-manage-technician` + segredo service role; utilizador deve ser `admin` ou `client` com `tenant_id` válido. |
| UI sem CRUD completo de clientes | `REACT_APP_USE_MOCK_API=true` ou variáveis Supabase em falta — só está ativo o modo Supabase com URL + chave pública. |
| Utilizador do cliente não vê o seu ambiente | Verificar `tenant_id` em `profiles`; utilizadores não-CTLI devem ter `tenant_id` definido. |

### Publicar Edge Functions (obrigatório para técnicos e utilizadores)

A função **não vem com o site** — tem de existir no **mesmo projeto** que `REACT_APP_SUPABASE_URL`.

**Passos (PowerShell, pasta `frontend`):**

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
.\scripts\deploy-edge-functions.ps1
```

O **Project Ref** está em Supabase → Settings → General → Reference ID.

**Segredos:** Supabase → Edge Functions → **Secrets** → criar **`CTLI_SERVICE_ROLE_KEY`** com o valor de Settings → API → **service_role** (secret). Sem isto, criar técnico/utilizador falha com erro 500.

**Confirmar:** em Edge Functions deve aparecer `tenant-manage-technician`. URL sem deploy: `https://SEU_REF.supabase.co/functions/v1/tenant-manage-technician` → 404.

## Notas

- O CRA emite ficheiros estáticos para `build/`; o Vercel deve usar esse diretório como saída.
- Sessão Supabase: o frontend grava o JWT de acesso em `localStorage` como `pv_token` para reutilizar o interceptor Axios quando `REACT_APP_BACKEND_URL` estiver configurado.
