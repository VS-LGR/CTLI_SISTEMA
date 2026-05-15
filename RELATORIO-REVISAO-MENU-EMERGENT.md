# Relatório de alteração — subsessões requisitos 5–8 e remoção Emergent

**Data:** conforme revisão implementada no repositório `frontend`.

---

## Tipo de alteração

| Tipo | Sim |
|------|-----|
| Conteúdo | Sim — árvore de subsessões (PR-6.x, PR-7.x, PR-8.x e itens do requisito 5) centralizada em config |
| Estética | Sim — remoção do badge e textos Emergent em `index.html` |
| Estrutural leve | Sim — nova rota `/requirement/:id/:folderKey`, sem mover pastas do projeto |
| Técnica | Sim — parâmetro opcional `folder_key` em listagem/criação de documentos; mock atualizado; CRACO sem `withVisualEdits` |
| Performance | Não relevante |
| SEO | Sim de forma mínima — `title` e `meta description` passam a ProcVault/QMS (antes referiam Emergent) |

---

## Ficheiros modificados ou criados

| Ficheiro | Alteração |
|----------|-----------|
| `public/index.html` | Título e meta alinhados ao produto; remoção de script e badge Emergent |
| `craco.config.js` | Removido wrap `withVisualEdits` / Emergent; export direto da config webpack |
| `package.json` | Removida `devDependency` `@emergentbase/visual-edits` |
| `package-lock.json` | Atualizado via `npm install` |
| `src/lib/requirementNavConfig.js` | **Novo** — `REQ_NAMES`, `REQ_MENU_ITEMS`, pastas 5–8, helpers e `buildRequirementListPath` |
| `src/App.js` | Rota adicional `/requirement/:id/:folderKey` antes da rota sem `folderKey` |
| `src/components/Layout.jsx` | Menu: requisito 4 plano; 5–8 com `Collapsible` + links por `folderKey` |
| `src/pages/RequirementView.jsx` | Redirects; `folder_key` na API; breadcrumb; `CreateDocDialog` com `folder_key` |
| `src/pages/DocumentEditor.jsx` | `REQ_NAMES` e link “Voltar” via `buildRequirementListPath`; `PUT` com `folder_key` |
| `src/lib/mockBackend.js` | `folder_key` em seeds, filtro em `GET /documents`, campo em `POST /documents` |

---

## Motivo

1. **Menu:** separar documentação por subsessões dentro dos requisitos 5, 6, 7 e 8, com textos definidos em configuração única para facilitar manutenção.
2. **Emergent:** eliminar vestígios visuais e textuais e dependência de desenvolvimento associada à plataforma Emergent.

---

## Impacto

- **Arquitetura:** mantidos `Layout`, `RequirementView`, `DocumentEditor` como componentes existentes; apenas extensão de props/params e um módulo de config novo.
- **API real:** o cliente envia `folder_key` opcional em `GET /documents` e no corpo de `POST /documents` / `PUT`. Se o backend ainda não filtrar nem persistir este campo, a listagem em produção pode mostrar todos os documentos do requisito (comportamento anterior). O **mock** aplica o filtro corretamente.
- **Rotas:** URLs antigas `/requirement/4` inalteradas. Para 5–8, `/requirement/:id` redireciona para a primeira subsessão configurada.
- **SEO:** `index.html` deixa de referenciar emergent.sh no título e na descrição.

---

## Possíveis melhorias futuras

- KPIs no dashboard por `folder_key` (agregação no backend ou no mock).
- Sincronizar contrato da API real (campos e índices) com `folder_key`.
- Estado “aberto/fechado” do `Collapsible` persistido por utilizador (opcional).

---

## Verificação

- `npm run build` com `REACT_APP_USE_MOCK_API=true` concluiu com sucesso (avisos ESLint pré-existentes de `exhaustive-deps`).
