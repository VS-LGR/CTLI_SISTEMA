# Controle de Mudança — CC-012

| Campo | Valor |
|-------|-------|
| Sistema / versão atual | QUATI `0.1.0` |
| Solicitante | DevSistem (renomeação oficial de produto e marca) |
| Data | 15/09/2026 |
| Tipo | Planejada |

**Documento:** rascunho DevSistem. Vistos da Qualidade em falta.

## 1. Descrição da mudança

Nome comercial e marca do sistema passam a **QUATI**. Logos: `public/Logo_QUATI.png` (marca) e `public/Logo_QUATI_wide.png` (wordmark). Remoção de menções aos nomes anteriores na aplicação, textos legais e dossiê CSV.

## 2. Motivo / benefício

Identidade comercial oficial. Alinha UI, favicon, EULA/licença e dossiê de validação ao nome e às marcas em uso.

## 3. Avaliação de impacto

| Área | Impacto | Notas |
|------|---------|--------|
| BPx / registros | Baixo–médio | Não altera fórmulas, RLS, e-sign nem trilha. Altera identidade apresentada e textos legais. |
| ALCOA+ | Baixo | Atribuível inalterado. Utilizadores devem voltar a aceitar termos (versão legal `2026-09-15`). |
| Documentos CSV | Sim | Inventário, ERU, PV, RFV, FOR-SGQ-010A e DPA: nome do sistema. |

## 4. Artefactos a atualizar / evidenciar

- `src/lib/appBranding.js`, `src/lib/legal/copyright.js`, `AppBrand.jsx`, `public/index.html`
- EULA, licença, `LICENSE`, aceite legal
- Dossiê em `docs/csv/`
- QO: confirmar ecrãs de login/sidebar na execução (identidade visual)

## 5. Aprovações

| Papel | Nome | Data | Visto |
|-------|------|------|-------|
| Solicitante | | | |
| Qualidade | | | |
| TI / DevSistem | | | |
