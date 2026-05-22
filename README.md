# ProcVault

Sistema de gestão de procedimentos, cadastros e coleta (ISO 17025). Este repositório contém a aplicação React e o backend Supabase (migrações SQL, Storage, Edge Functions). A pasta chama-se `frontend` por histórico; não é um cliente separado à espera de outra API.

## Início rápido

```bash
npm install --legacy-peer-deps
npm start
```

Modo demo sem Supabase: `REACT_APP_USE_MOCK_API=true` no `.env`.

## Supabase (produção)

1. Defina `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY` (ou chave publicável).
2. Aplique as migrações em `supabase/migrations/` (ver [DEPLOY.md](DEPLOY.md)).
3. Publique as Edge Functions listadas em [DEPLOY.md](DEPLOY.md).

`REACT_APP_BACKEND_URL` é **opcional** (dados legados ou transição). Documentos, dashboard e backup usam `tenant_documents` no Supabase.

## Build

```bash
npm run build
```

Deploy na Vercel: ver [DEPLOY.md](DEPLOY.md).
