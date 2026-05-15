# Deploy (Vercel + Supabase)

## Variáveis de ambiente no Vercel

Defina no painel do projeto Vercel (Settings → Environment Variables):

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `REACT_APP_SUPABASE_URL` | Sim (modo Supabase) | URL do projeto (Settings → API no Supabase). |
| `REACT_APP_SUPABASE_ANON_KEY` | Sim (modo Supabase) | Chave `anon` **publicável** (nunca a `service_role`). |
| `REACT_APP_BACKEND_URL` | Opcional | URL base da API legada (documentos, etc.); omitir se ainda não existir backend. |
| `REACT_APP_USE_MOCK_API` | Opcional | `true` apenas para demo local sem Supabase nem API. |

O build usa `npm install --legacy-peer-deps && npm run build` (ver `vercel.json`).

## Supabase (CLI)

1. Aplicar migrações SQL em `supabase/migrations/` ao projeto (Supabase SQL Editor ou `supabase db push` com o CLI ligado ao projeto).
2. Publicar Edge Functions com segredos automáticos `SUPABASE_URL`, `SUPABASE_ANON_KEY` e definir **`SUPABASE_SERVICE_ROLE_KEY`** nos segredos da função (Dashboard → Edge Functions → Secrets), necessário para `admin-create-user`, `admin-update-user` e `admin-delete-user`.
3. Criar o primeiro utilizador em Authentication; garantir linha em `profiles` com `role = 'admin'` (via trigger/metadata ou UPDATE manual).

## Notas

- O CRA emite ficheiros estáticos para `build/`; o Vercel deve usar esse diretório como saída.
- Sessão Supabase: o frontend grava o JWT de acesso em `localStorage` como `pv_token` para reutilizar o interceptor Axios quando `REACT_APP_BACKEND_URL` estiver configurado.
