# Deploy (Vercel + Supabase)

## Variáveis de ambiente no Vercel

Defina no painel do projeto Vercel (Settings → Environment Variables):

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `REACT_APP_SUPABASE_URL` | Sim (modo Supabase) | URL do projeto (Settings → API no Supabase). |
| `REACT_APP_SUPABASE_ANON_KEY` *ou* `REACT_APP_SUPABASE_PUBLISHABLE_KEY` | Sim (modo Supabase) | Chave **publicável** do painel (`anon` / JWT ou `sb_publishable_…`). Nunca expor `service_role`. |
| `REACT_APP_BACKEND_URL` | Opcional | URL base da API legada (documentos, etc.); omitir se ainda não existir backend. |
| `REACT_APP_USE_MOCK_API` | Opcional | `true` apenas para demo local sem Supabase nem API. |

### Backup (Edge Function `tenant-backup`) — ZIP local

O backup **não** é guardado no Supabase Storage. O utilizador **gera e baixa** um `.zip` e guarda no PC; para recuperar, faz **upload** do mesmo ficheiro.

Segredos na Edge Function `tenant-backup`:

| Segredo | Obrigatório | Descrição |
|---------|-------------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Export/restore com service role. |
| `LEGACY_API_URL` | Opcional | URL base da API de documentos (ex. `https://api.exemplo.com`). |
| `LEGACY_API_SERVICE_TOKEN` | Opcional | Token de serviço para export/restore de documentos. |

Migrações de backup (por ordem): `20250623000000` (colunas em `tenants`), depois **`20250624000000_tenant_backup_local_only.sql`** — remove tabela `tenant_backup_runs`, cron automático e histórico na nuvem. **Não** é necessário aplicar `20250623100000` (cron na nuvem) se usar só backup local.

Após alterar a função: `supabase functions deploy tenant-backup`.

**SQL Editor:** execute **um bloco de cada vez** em `20250624000000`. Limite de tamanho do ZIP na resposta: ~5 MB (Edge Function).

O build usa `npm install --legacy-peer-deps && npm run build` (ver `vercel.json`).

## Supabase (CLI)

1. Aplicar migrações SQL em `supabase/migrations/` ao projeto (Supabase SQL Editor ou `supabase db push` com o CLI ligado ao projeto).
2. Publicar Edge Functions com segredos automáticos `SUPABASE_URL`, `SUPABASE_ANON_KEY` e definir **`SUPABASE_SERVICE_ROLE_KEY`** nos segredos da função (Dashboard → Edge Functions → Secrets), necessário para `admin-create-user`, `admin-update-user` e `admin-delete-user`.
3. **Primeiro administrador CTLI:** criar o primeiro utilizador em **Authentication** (ou convite). Na tabela `public.profiles`, garantir `role = 'admin'` e `tenant_id IS NULL` (por trigger com metadata, ou `UPDATE` manual no SQL Editor). Sem isto, **não** consegue inserir linhas em `tenants` nem gerir contas (RLS).

4. **Contas de portal:** utilize papel `client` (ou outros papéis com `tenant_id`) ao convidar utilizadores; o separador **Conta cliente (portal)** aparece no ecrã de criação de utilizadores quando o frontend está atualizado.

5. **Lembretes da dashboard:** aplicar `20250625000000_dashboard_reminders.sql` (tabela `dashboard_reminders` no Supabase — sem API legada).

6. **Cadastros e anexos:** aplicar também a migração `20250616000000_cadastros_multitenant.sql`, que cria tabelas de fornecedores, clientes do cliente, colaboradores, certificados e o **bucket** privado `cadastro-certificados` com políticas RLS em `storage.objects`. O primeiro segmento do caminho do ficheiro deve ser o UUID do tenant (`{tenant_id}/weight|env/{cert_id}/{filename}`).

## Resolução de problemas (criação de ambientes / utilizadores)

| Sintoma | Causa provável |
|---------|------------------|
| Erro de permissão / RLS ao criar ambiente | Sessão não é `profiles.role = 'admin'` ou env Supabase incorreto. |
| Criação de ambiente OK, falha ao criar utilizador | Edge Functions `admin-create-user` não deployadas ou falta `SUPABASE_SERVICE_ROLE_KEY` nos segredos. |
| UI sem CRUD completo de clientes | `REACT_APP_USE_MOCK_API=true` ou variáveis Supabase em falta — só está ativo o modo Supabase com URL + chave pública. |
| Utilizador do cliente não vê o seu ambiente | Verificar `tenant_id` em `profiles`; utilizadores não-CTLI devem ter `tenant_id` definido. |

## Notas

- O CRA emite ficheiros estáticos para `build/`; o Vercel deve usar esse diretório como saída.
- Sessão Supabase: o frontend grava o JWT de acesso em `localStorage` como `pv_token` para reutilizar o interceptor Axios quando `REACT_APP_BACKEND_URL` estiver configurado.
