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

Conversão para Pedido de Compra: **fase 2** (`converted_purchase_order_id` reservado; botão desabilitado na UI).

## Cadastros reutilizados

- **Ambiente (tenant):** solicitante — snapshot em `client_environment_data_snapshot`
- **Fornecedores:** `supplier_registrations`
- **Colaboradores:** «Enviado por»
- **Pesos padrão / certificados:** importação em calibração/aquisição de pesos
- **Termo-baro-higrômetro:** importação em calibração/aquisição TBH

## PDF

- Cabeçalho: logo, título, DATA, Nº, Cód./Ref./Rev./Emissão do modelo
- Snapshots apenas (documentos antigos não mudam se cadastro for alterado)
- Watermark **RASCUNHO** em status rascunho
- `displayValue()` evita `#N/D`, `undefined`, `null`, `NaN`

## Ficheiros principais

| Ficheiro | Função |
|----------|--------|
| `supabase/migrations/20250629000000_quotation_requests.sql` | Schema |
| `src/lib/quotationRequestsApi.js` | CRUD Supabase |
| `src/lib/quotationRequestTypes.js` | Tipos, status, colunas |
| `src/lib/quotationRequestPdf/` | Export PDF jsPDF |
| `src/components/quotationRequests/` | UI |
| `src/pages/QuotationRequestEditorPage.jsx` | Editor |

## Migration

Aplicar no Supabase:

```bash
supabase db push
```

## Mapeamento futuro → Pedido de Compra (fase 2)

| Solicitação | Pedido de compra |
|-------------|------------------|
| ensaio_proficiencia | ensaio_proficiencia |
| auditoria_interna | auditoria_interna |
| calibracao_termo_baro_higrometro | calibracao_termo_baro_higrometro |
| calibracao_pesos_padrao | calibracao_pesos_padrao |
| aquisicao_termo_baro_higrometro | compra_termo_baro_higrometro |
| aquisicao_pesos_padrao | compra_pesos |
| treinamento | *(sem equivalente — manual)* |

Campo «Conforme Cotação Nº» no pedido pode receber `001/2026` da solicitação.
