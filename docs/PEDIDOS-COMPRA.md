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
- **purchase_orders.quotation_request_id** — origem quando criado a partir de solicitação de orçamento
- **quotation_request_conversions** — ligação N:1 por tipo (migração `20250630000000_quotation_po_conversion.sql`)
- RLS via `cadastro_tenant_access(tenant_id)`
- Função `next_purchase_order_number(tenant_id, year)`

## Camada frontend

| Ficheiro | Função |
|----------|--------|
| `purchaseOrderTypes.js` | Tipos (6), status, transições, validações |
| `purchaseOrderCalculations.js` | Totais, `formatDisplayValue` |
| `purchaseOrderSnapshots.js` | Snapshots fornecedor/ambiente/colaborador |
| `purchaseOrdersApi.js` | CRUD, inspeção, status, duplicar, assinaturas |
| `quotationToPurchaseOrder.js` | Mapeamento solicitação → pedido (conversão) |
| `pedidosCompraExport.js` | Export PDF (chunk lazy) |
| `pedidoCompraPdf/viewModel.js` | View model só com snapshots |
| `pedidoCompraPdf/drawPedidoCompraPdf.js` | jsPDF + autoTable, 6 layouts de colunas, watermark RASCUNHO |

## UI

- `PedidosCompraPage.jsx` — lista
- `PurchaseOrdersListPanel.jsx` — listagem PR-6.6 com alteração de status (badge ou menu)
- `PedidoCompraEditorPage.jsx` — editor (tabs: dados, serviços, inspeção, status); painel de status no topo
- `PurchaseOrderStatusPanel.jsx` — stepper + ações de próximo passo
- `purchaseOrderStatusFlow.js` — etapas visuais e rótulos das transições
- `purchaseOrderInspectionFields.js` — perguntas de inspeção partilhadas (formulário + PDF)
- `components/purchaseOrders/` — tabela de serviços dinâmica, rodapé de totais, inspeção
- `hooks/usePurchaseOrderCadastroData.js` — cadastros em paralelo

## Cadastros reutilizados

- Fornecedores → snapshot no pedido
- Tenant (ambiente) → dados de faturamento (Admin → editar ambiente)
- Colaboradores → responsáveis + assinatura (`CadastrosPage` → colaboradores)
- Calibração de pesos-padrão: **todos os campos da linha de serviço são manuais** (sem import do cadastro de pesos)
- Calibração termo/barómetro: import opcional de equipamento na tabela
- Assinatura 2: presets **Compras** ou **Gerente da Qualidade** (sem Vendas)

## Origem em solicitação de orçamento

Pedidos gerados pela conversão (RE-6.6C → RE-6.6E):

- `quotation_request_id` e «Conforme cotação nº» preenchidos automaticamente
- Snapshots de fornecedor/ambiente herdados da solicitação
- Serviços mapeados por tipo; valores financeiros ficam a zero para preenchimento manual
- Link «Origem: Solicitação …» no editor do pedido

## PDF

- Título fixo: **Pedido de compras**; tipo de serviço abaixo do título
- **Emissão** no cabeçalho = versão do formulário (`RE-6.6E Rev. 00`), não data
- Ordem: complementos → **inspeção de recebimento** → assinaturas
- Inspeção: todas as perguntas do tipo (respostas Sim/Não, resultado, responsável, data)
- Export no editor inclui inspeção do formulário antes de «Guardar inspeção»; persistir na BD recomendado

## Workflow de status

`rascunho` → `aguardando_aprovacao_tecnica` → `aprovado_tecnicamente` → `enviado_fornecedor` → `aguardando_recebimento` → (`recebido_parcialmente` \| `recebido` \| `reprovado_recebimento`) \| `cancelado`

**Edição** permitida em qualquer status.

**Reabertura** de estados finais:

- `recebido` / `reprovado_recebimento` → `aguardando_recebimento`
- `cancelado` → `rascunho`

**Alterar status** na listagem (clique no badge ou menu «Alterar status») ou no topo do editor (tab Status mantém o mesmo painel).

## Backup tenant

`supabase/functions/tenant-backup` inclui pasta `pedidos_compra/` no ZIP (orders, items, inspections, signatures).

## QA manual sugerido

1. Criar pedido de calibração de pesos — códigos só manual; termo com import de equipamento.
2. Salvar e reabrir — snapshots imutáveis.
3. Transições de status na lista e no editor; reabrir pedido recebido.
4. Editar pedido concluído (recebido).
5. Inspeção → guardar → PDF com secção completa; export sem guardar inspeção no editor.
6. Lista: filtros, duplicar, PDF, alterar status.
7. Converter solicitação aprovada → pedido(s); verificar link de origem e campo cotação.
