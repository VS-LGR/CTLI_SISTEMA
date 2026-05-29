# Solicitações de Orçamento (RE-6.6C)

Módulo PR-6.6 para criar, editar, listar e exportar solicitações de orçamento conforme formulário **RE-6.6C** (ref. **PR-6.6**, rev. **00**, emissão do modelo **30/06/2025**).

## Rotas

| Rota | Descrição |
|------|-----------|
| `/requirement/6/pr-6-6?tab=solicitacoes_orcamento` | Listagem em PR-6.6 |
| `/solicitacoes-orcamento` | Listagem standalone |
| `/solicitacoes-orcamento/nova` | Nova solicitação |
| `/solicitacoes-orcamento/:id` | Editor |

## Tipos (7)

1. Aquisição de Ensaio de Proficiência
2. Aquisição de Auditoria Interna
3. Calibração de Thermo Baro Higrômetro RBC
4. Calibração de Pesos Padrão RBC
5. Aquisição de Treinamento
6. Aquisição de Thermo Baro Higrômetro RBC
7. Aquisição de Pesos Padrão RBC

*(Locação de Pesos Padrão removida do escopo.)*

## Status

`rascunho` → `aguardando_envio` → `enviada_fornecedor` → `orcamento_recebido` → `em_analise` → `aprovada` | `reprovada` | `cancelada`

Após conversão em pedido(s) de compra: `convertida_pedido_compra` (automático quando todos os tipos convertíveis foram convertidos).

## Conversão → Pedido de Compra

- Disponível **apenas** com status `aprovada`
- **Um pedido de compra por tipo convertível** selecionado na solicitação
- `treinamento` não gera pedido (sem equivalente em RE-6.6E)
- Campo «Conforme Cotação Nº» no pedido recebe o nº da solicitação (`001/2026`)
- Pedidos criados em `rascunho` — valores, pagamento e assinaturas são preenchidos no editor do pedido
- Ligação bidirecional: `quotation_request_conversions` + `purchase_orders.quotation_request_id`
- Re-conversão é idempotente (não duplica tipos já convertidos)

| Solicitação | Pedido de compra |
|-------------|------------------|
| ensaio_proficiencia | ensaio_proficiencia |
| auditoria_interna | auditoria_interna |
| calibracao_termo_baro_higrometro | calibracao_termo_baro_higrometro |
| calibracao_pesos_padrao | calibracao_pesos_padrao |
| aquisicao_termo_baro_higrometro | compra_termo_baro_higrometro |
| aquisicao_pesos_padrao | compra_pesos |
| treinamento | *(sem equivalente)* |

## Cadastros reutilizados

- **Ambiente (tenant):** solicitante — snapshot em `client_environment_data_snapshot`
- **Fornecedores:** `supplier_registrations`
- **Colaboradores:** «Enviado por»
- **Calibração/aquisição de pesos:** preenchimento manual (sem import do cadastro)
- **Termo-baro-higrômetro:** importação em calibração/aquisição TBH

## PDF

- Cabeçalho: logo, título, DATA, Nº, Cód./Ref./Rev./Emissão do modelo
- Snapshots apenas (documentos antigos não mudam se cadastro for alterado)
- Watermark **RASCUNHO** em status rascunho
- `displayValue()` evita `#N/D`, `undefined`, `null`, `NaN`

## Ficheiros principais

| Ficheiro | Função |
|----------|--------|
| `supabase/migrations/20250629000000_quotation_requests.sql` | Schema solicitações |
| `supabase/migrations/20250630000000_quotation_po_conversion.sql` | Ponte solicitação ↔ pedido |
| `src/lib/quotationRequestsApi.js` | CRUD Supabase + conversão |
| `src/lib/quotationToPurchaseOrder.js` | Mapeamento QR → PO |
| `src/lib/quotationRequestTypes.js` | Tipos, status, colunas |
| `src/lib/quotationRequestPdf/` | Export PDF jsPDF |
| `src/components/quotationRequests/` | UI |
| `src/pages/QuotationRequestEditorPage.jsx` | Editor |

## Migration

Aplicar no Supabase:

```bash
supabase db push
```

*(Inclui `20250630000000_quotation_po_conversion.sql` para a ponte com pedidos de compra.)*
