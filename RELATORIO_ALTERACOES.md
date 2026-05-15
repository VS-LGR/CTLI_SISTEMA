# Relatório de alterações — Supabase, Vercel e CRUD administrativo

## Resumo

Integração opcional com **Supabase Auth** e dados em **PostgreSQL** (`tenants`, `profiles`, `responsibles`) com **RLS**; operações privilegiadas de utilizador via **Edge Functions**. O **Create React App** pode ser publicado na **Vercel** com variáveis públicas do Supabase. A API REST existente (`REACT_APP_BACKEND_URL`) permanece para **documentos e restantes rotas** (fase 2).

## Alterações técnicas

- **Autenticação:** Com `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY` definidos e sem mock, o `AuthProvider` usa `signInWithPassword`, `getSession`, `onAuthStateChange` e lê o perfil em `profiles`. O objeto exposto mantém `id`, `name` (de `full_name`), `email`, `role`, `tenant_id`, compatível com `App.js` / `Protected`.
- **Token legado:** O access token da sessão Supabase é guardado em `localStorage` como `pv_token` para o Axios continuar a enviar `Authorization` quando existir backend REST.
- **Admin / Layout:** Listagem de clientes no menu lateral usa Supabase em modo Supabase; caso contrário mantém `GET /tenants`.
- **AdminClients:** Em modo Supabase, CRUD de clientes e responsáveis na base; utilizadores criados/editados/removidos via `admin-create-user`, `admin-update-user`, `admin-delete-user`; secção **Administradores globais**; diálogos de edição para cliente, utilizador e responsável. Em modo mock/API antiga, comportamento anterior (sem edição de cliente/utilizador/responsável onde a API não suportava).

## Ficheiros relevantes

| Área | Ficheiros |
|------|-----------|
| SQL | `supabase/migrations/20250615000000_initial_schema.sql` |
| Edge Functions | `supabase/functions/admin-create-user/index.ts`, `admin-update-user/index.ts`, `admin-delete-user/index.ts` |
| Frontend | `src/lib/supabaseClient.js`, `src/lib/api.js`, `src/context/AuthContext.jsx`, `src/components/Layout.jsx`, `src/pages/AdminClients.jsx`, `src/pages/Login.jsx` |
| Deploy | `vercel.json`, `DEPLOY.md` |
| Dependência | `@supabase/supabase-js` em `package.json` |

## Impacto

- **Utilizadores:** Migração gradual; primeiro admin pode exigir ajuste manual de `profiles.role` ou criação via função com metadata correta.
- **Documentos / dashboard:** Continuam dependentes de `REACT_APP_BACKEND_URL` e do token partilhado até uma fase 2 migrar dados e rotas para Supabase ou outra API.

## Fase 2 (referência)

Substituição progressiva de chamadas em `src/lib/api.js` por tabelas Supabase (ex.: documentos), mantendo coerência de `tenant_id` e papéis com `src/lib/roles.js`.
