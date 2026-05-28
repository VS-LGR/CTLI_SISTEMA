# Módulo Pedidos de Compra — Trevo Calibrações

## Rotas

| Rota | Página |
|------|--------|
| `/pedidos-compra` | Lista com filtros e ações |
| `/pedidos-compra/nova` | Novo pedido (seleção de tipo) |
| `/pedidos-compra/:id` | Editor completo |

Definições em `src/lib/pedidosCompraRoutes.js`. Rotas registadas em `src/App.js` (lazy). Acesso principal via PR-6.6 (`PR_66_PEDIDOS_PATH`) e atalho na dashboard.

## Permissões

`canAccessPurchaseOrders` em `src/lib/roles.js`: admin, client, diretor, gerente_qualidade, gerente_tecnico, administrativo_vendas.

## Base de dados (Supabase)

Migração: `supabase/migrations/20250627000000_tenant_billing_purchase_orders.sql`

- **tenants**: campos `legal_name`, `trade_name`, `billing_*`, `environment_responsible_name`
- **employee_registrations**: `signature_storage_path`
- **purchase_orders**, **purchase_order_items**, **purchase_order_inspections**, **purchase_order_signatures**
- RLS via `cadastro_tenant_access(tenant_id)`
- Função `next_purchase_order_number(tenant_id, year)`

## Camada frontend

| Ficheiro | Função |
|----------|--------|
| `purchaseOrderTypes.js` | Tipos (6), status, transições, validações |
| `purchaseOrderCalculations.js` | Totais, `formatDisplayValue` |
| `purchaseOrderSnapshots.js` | Snapshots fornecedor/ambiente/colaborador |
| `purchaseOrdersApi.js` | CRUD, inspeção, status, duplicar, assinaturas |
| `pedidosCompraExport.js` | Export PDF (chunk lazy) |
| `pedidoCompraPdf/viewModel.js` | View model só com snapshots |
| `pedidoCompraPdf/drawPedidoCompraPdf.js` | jsPDF + autoTable, 6 layouts de colunas, watermark RASCUNHO |

## UI

- `PedidosCompraPage.jsx` — lista
- `PedidoCompraEditorPage.jsx` — editor (tabs: dados, serviços, inspeção, status)
- `PurchaseOrderStatusPanel.jsx` — stepper + ações de próximo passo (sem grelha de 9 estados)
- `purchaseOrderStatusFlow.js` — etapas visuais e rótulos das transições
- `purchaseOrderInspectionFields.js` — perguntas de inspeção partilhadas (formulário + PDF)
- `components/purchaseOrders/` — tabela de serviços dinâmica, rodapé de totais, inspeção
- `hooks/usePurchaseOrderCadastroData.js` — cadastros em paralelo

## Cadastros reutilizados

- Fornecedores → snapshot no pedido
- Tenant (ambiente) → dados de faturamento (Admin → editar ambiente)
- Colaboradores → responsáveis + assinatura (`CadastrosPage` → colaboradores)
- Pesos / certificados / termo → importação parcial na tabela (código do peso preenchido manualmente)
- Assinatura 2: presets **Compras** ou **Gerente da Qualidade** (sem Vendas)

## PDF

- Título fixo: **Pedido de compras**; tipo de serviço abaixo do título
- **Emissão** no cabeçalho = versão do formulário (`RE-6.6E Rev. 00`), não data
- Inspeção: todas as perguntas do tipo, com respostas Sim/Não e responsável

## Workflow de status

`rascunho` → `aguardando_aprovacao_tecnica` → `aprovado_tecnicamente` → `enviado_fornecedor` → `aguardando_recebimento` → (`recebido_parcialmente` \| `recebido` \| `reprovado_recebimento`) \| `cancelado`

Após `recebido` / `reprovado_recebimento` / `cancelado`: edição bloqueada (`canEditOrder`).

## Backup tenant

`supabase/functions/tenant-backup` inclui pasta `pedidos_compra/` no ZIP (orders, items, inspections, signatures).

## QA manual sugerido

1. Criar pedido de cada um dos 6 tipos; verificar autopreenchimento a partir de cadastros.
2. Salvar e reabrir — snapshots de fornecedor/ambiente imutáveis face ao cadastro.
3. Transições de status e bloqueio pós-recebimento.
4. Inspeção por tipo; guardar resultado.
5. Exportar PDF em rascunho (watermark) e após aprovação técnica.
6. Lista: filtros, duplicar, PDF, mobile (cards sem overflow horizontal).
7. Admin: dados de faturamento no ambiente; assinatura no colaborador.
