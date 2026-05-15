# Análise do frontend ProcVault e verificação de ambiente local

**Data da verificação:** 14 de maio de 2026  
**Escopo:** pasta `frontend` (Create React App + CRACO + Tailwind + Radix/shadcn-style UI).

---

## 1. Resumo executivo

O projeto é uma SPA React 19 para um sistema de gestão de qualidade (QMS) chamado **ProcVault**, com autenticação baseada em API REST, multi-tenant (clientes), dashboard com gráficos, listagem de requisitos, editor de documentos ricos (TipTap) e áreas administrativas.

A verificação local incluiu instalação de dependências e **build de produção** (`npm run build`), que **concluiu com sucesso** após ajustes de dependência descritos na secção 3. O servidor de desenvolvimento espera-se que funcione da mesma forma (`npm start`), desde que a variável de ambiente do backend esteja definida e o backend esteja acessível.

---

## 2. Como rodar localmente para testes

### Pré-requisitos

- **Node.js** (testado com v22.22.0). CRA 5 costuma funcionar bem com LTS; se surgirem erros estranhos de build, vale testar Node 20 LTS.
- **npm** (yarn está referenciado em `packageManager`, mas no ambiente verificado o comando `yarn` não estava disponível; **npm** foi usado com sucesso).

### Variável de ambiente obrigatória

O cliente HTTP em `src/lib/api.js` usa:

- `REACT_APP_BACKEND_URL` — URL **sem** sufixo `/api` (o código acrescenta `/api`).

Exemplo no PowerShell (Windows):

```powershell
$env:REACT_APP_BACKEND_URL = "http://localhost:8000"
npm start
```

Sem esta variável, `API_BASE` fica `undefined/api`, o que quebra todas as chamadas.

**Recomendação:** criar um ficheiro `.env.local` na raiz do `frontend` (não versionado) com:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

(Ajuste a porta ao backend real.)

### Instalação

```powershell
cd "caminho\para\frontend"
npm install --legacy-peer-deps
```

É necessário **`--legacy-peer-deps`** porque existe conflito de peer entre `react-day-picker@8.10.1` (espera `date-fns` ^2 ou ^3) e o projeto (declara `date-fns@^4.1.0`). Sem esta flag, o `npm install` falha com `ERESOLVE`.

### Scripts úteis

| Comando | Função |
|--------|--------|
| `npm start` | Servidor de desenvolvimento (CRACO), habitualmente `http://localhost:3000` |
| `npm run build` | Bundle otimizado para produção na pasta `build/` |
| `npm test` | Testes CRA (CRACO) |

### Opcional: health check no dev server

Em `craco.config.js`, se `ENABLE_HEALTH_CHECK=true`, carrega plugins em `plugins/health-check/` (não necessário para uso normal).

### Opcional: visual edits

Em modo não produção, o CRACO tenta carregar `@emergentbase/visual-edits/craco`; se o pacote falhar, o arranque continua com aviso (conforme `try/catch` no ficheiro).

---

## 3. Resultado da verificação técnica (executada neste ambiente)

| Etapa | Resultado |
|-------|-----------|
| `npm install` (sem flags) | **Falha** — `ERESOLVE` (`date-fns` vs `react-day-picker`) |
| `npm install --legacy-peer-deps` | **OK** |
| `npm run build` (com `REACT_APP_BACKEND_URL`) | **Falha inicial** — `Cannot find module 'ajv/dist/compile/codegen'` (mistura `ajv@6` no topo com `ajv-keywords@5` que exige `ajv@8`) |
| Correção aplicada | `devDependency` direta **`ajv@^8.17.1`** + `overrides` para `ajv-keywords@5.1.0` → `ajv@^8.17.1` em `package.json` |
| `npm run build` após correção | **OK**, com avisos ESLint (hooks — ver abaixo) |

**Build:** ficheiros principais gerados (gzip): JS ~430 kB, CSS ~11 kB.

**Avisos ESLint no build:** `react-hooks/exhaustive-deps` em `Layout.jsx`, `BackupView.jsx`, `DocumentEditor.jsx`, `RequirementView.jsx` (efeitos com dependências omitidas de propósito ou por engano). Não impedem o build.

**Segurança:** após `npm install`, o relatório apontou várias vulnerabilidades transitivas (comum em stacks CRA antigas). Não foram alteradas automaticamente; pode avaliar `npm audit` / upgrades planeados.

---

## 4. Arquitetura e fluxo da aplicação

### 4.1 Entrada e composição

- `src/index.js` — `ReactDOM.createRoot`, `StrictMode`, import global de estilos (`index.css`), montagem de `App`.
- `src/App.js` — `BrowserRouter`, `AuthProvider`, notificações `sonner`, definição de rotas.

### 4.2 Roteamento e proteção

Rotas públicas:

- `/login` — `Login.jsx`.

Rotas protegidas (layout com sidebar):

- Envoltório `Protected`: consulta `useAuth().user`:
  - `null` — ecrã “Carregando…” (sessão a verificar).
  - `false` — redireciona para `/login` com `state.from`.
  - objeto — utilizador autenticado; se `adminOnly` e papel ≠ `admin`, redireciona para `/dashboard`.

Rotas filhas de `Layout`:

- `/` → redireciona para `/dashboard`
- `/dashboard` — KPIs e gráficos (Recharts), dados por `tenant_id`
- `/requirement/:id` — vista de requisito (IDs fixos na navegação: 4–8)
- `/document/:id` — editor de documento (TipTap + metadados, exportação, etc.)
- `/backup` — vista de backup
- `/admin/clients` — **só admin** (`Protected` aninhado com `adminOnly`)

Qualquer outra rota cai em `*` → `/dashboard`.

### 4.3 Autenticação e estado (`src/context/AuthContext.jsx`)

- No mount, `GET /auth/me` define o utilizador ou marca como não autenticado.
- Login: `POST /auth/login`; se vier `access_token`, guarda em `localStorage` como `pv_token`.
- Logout: `POST /auth/logout` (ignora erro), limpa `pv_token` e `pv_current_tenant`.
- **Cookies + Bearer:** `axios` está com `withCredentials: true` e um interceptor que envia `Authorization: Bearer <pv_token>` se existir token (útil se cookies forem bloqueados).

### 4.4 Cliente API (`src/lib/api.js`)

- `baseURL`: `${REACT_APP_BACKEND_URL}/api`
- `formatApiError` — normaliza mensagens de erro da API (string, array de objetos com `msg`, etc.).

### 4.5 Layout e multi-tenant (`src/components/Layout.jsx`)

- Carrega lista de tenants com `GET /tenants` quando há `user`.
- Mantém `currentTenantId` no contexto e em `localStorage` (`pv_current_tenant`).
- Admin pode trocar de cliente no cabeçalho; cliente provavelmente vê apenas o seu tenant (depende da API).
- Passa para as páginas filhas via `Outlet` context: `tenants`, `currentTenant`, `currentTenantId`, `isAdmin`, `reloadTenants`, `selectTenant`.

### 4.6 Páginas principais (comportamento resumido)

- **Dashboard** — `GET /dashboard?tenant_id=...`; trata ausência de tenants ou de tenant selecionado com mensagens de UI.
- **RequirementView** — documentos filtrados por requisito; lógica de carregamento e ações contra a API (detalhe no ficheiro).
- **DocumentEditor** — `GET /documents/:id`, `PUT` para gravar, fluxos de PDF/DOC, duplicar documento (`POST .../duplicate`), upload, etc.; editor HTML via **TipTap** em `RichEditor.jsx`.
- **AdminClients** — gestão de clientes (admin).
- **BackupView** — operações de backup.
- **Login** — formulário email/senha, integração com `login()` do contexto, toasts Sonner.

### 4.7 UI e estilos

- **Tailwind CSS** + utilitário `cn` / padrões em `src/lib/utils.js`.
- Componentes em `src/components/ui/*` — biblioteca estilo shadcn (Radix + CVA).
- Ícones: **Phosphor** e **Lucide** (conforme componente).
- **TipTap** para conteúdo rico (StarterKit, underline, link).

### 4.8 Alias de imports

- Webpack (CRACO): `@` → `src/`.
- `jsconfig.json` alinha `paths` para o IDE.

---

## 5. Dependência do backend

Toda a funcionalidade autenticada e de dados depende de um **backend REST** compatível com os endpoints usados (`/auth/*`, `/tenants`, `/dashboard`, `/documents`, etc.). Para testes reais de login e dados, o backend tem de:

- Estar a correr na URL configurada em `REACT_APP_BACKEND_URL`.
- Aceitar credenciais (cookies e/ou CORS com credenciais, conforme configuração).

Só o frontend, sem backend, permite no máximo verificar arranque da shell e redirecionamentos até ao login ou erros de rede.

---

## 6. Conclusões e próximos passos sugeridos

1. **Documentar no README** o uso de `REACT_APP_BACKEND_URL` e `npm install --legacy-peer-deps` (ou alinhar versões de `date-fns` / `react-day-picker` para remover a flag).
2. **Manter `ajv@^8`** como dependência de desenvolvimento (ou migrar tooling para uma stack mais recente que não sofra com o hoisting `ajv@6` vs `ajv-keywords@5`).
3. **Rever hooks** assinalados pelo ESLint para consistência e evitar stale closures.
4. **CORS e cookies:** validar com o backend real em desenvolvimento (mesma origem ou CORS explícito).

Este documento reflete o estado do repositório na data indicada e os comandos efetivamente executados na verificação.
