# DOCX em procedimentos — fidelidade de formatação

## Problema central

A perda de formatação **não ocorre no upload**. O ficheiro `.docx` vai intacto para o Supabase Storage (`uploadFileSupabase` em `documentsApi.js`).

A degradação aparece ao **abrir, editar, salvar ou exportar** no editor eigenpal:

- Cabeçalho institucional (logo, metadados Cód./Rev./Emissão/N.PÁG.)
- Tab stops e campos Word (`PAGE`, etc.)
- Rodapé e media ancorada no header

## Pipeline

| Etapa | Comportamento |
|-------|---------------|
| **Upload** | Bytes intactos; procedimentos `.docx` com `contentHtml: null` (sem Mammoth) |
| **Visualização** | `@eigenpal/docx-editor-react` em modo *viewing* por defeito; zoom 1; relayout após fontes |
| **Salvar** | Só regrava Storage se o documento estiver *dirty*; save seletivo + validação XML header/footer |
| **Baixar original** | Sempre bytes do Storage (nunca passa pelo editor) |
| **Export Word** | Se não dirty → original; se dirty → output validado de `saveDocxWithFidelity` |
| **Export PDF** | `print()` do editor em modo viewing + CSS print (fundo branco, sem toolbar/handles) |

## Ficheiros principais

| Ficheiro | Função |
|----------|--------|
| `src/components/documents/DocxEditorPanel.jsx` | Editor nativo, dirty tracking, relayout, viewing/editing |
| `src/lib/docxSaveFidelity.js` | Fingerprints header/footer (JSZip), save seletivo, bloqueio se regressão |
| `src/lib/docxEditorSave.js` | `saveDocxWithFidelity`, `printDocxFromEditor`, `relayoutDocxEditor` |
| `src/lib/docxImport.js` | Mammoth (só corpo); **não** usar como fonte de verdade para procedimentos |
| `src/lib/documentExport.js` | Export PDF/DOCX via HTML (fallback; aviso para `.docx` nativo) |
| `src/pages/DocumentEditor.jsx` | Save dirty-only, export alinhado, botão «Editar Word» |
| `src/index.css` | Host `.docx-editor-host`, `@media print`, `.docx-printing` |

## Dependência eigenpal

- Versão atual: `@eigenpal/docx-editor-react@1.0.3` (última publicada no npm).
- Fixes upstream relevantes (#172 tab stops, #200 media no header, #178 gap header/body) podem ainda não estar no npm — monitorizar [eigenpal/docx-editor](https://github.com/eigenpal/docx-editor) antes de atualizar.
- Após upgrade, repetir checklist QA abaixo.

## Checklist QA (RF Balanças PR 4.1)

1. Upload → abrir editor → comparar visual com Word desktop (págs. 1–2).
2. Salvar **sem** editar → Storage inalterado; toast «Metadados salvos (ficheiro Word inalterado)».
3. Editar um parágrafo do corpo → Salvar → header XML intacto; texto alterado no corpo.
4. Export Word/PDF após passo 3 → mesma fidelidade do Salvar.
5. «Baixar original» → ficheiro idêntico ao upload (antes de qualquer save dirty).
6. Regressão com documento Trevo modelo quando disponível em `public/templates/`.

## Modelo Trevo

Novo procedimento sem ficheiro usa `blankDocx.js` (sem cabeçalho institucional).

Para layout Trevo completo:

1. Coloque `modelo-procedimento-trevo.docx` em `public/templates/` (ver README nessa pasta).
2. Use **Modelo Word (Trevo)** na criação ou envie o seu `.docx` via «Selecionar arquivo».

### Recomendações para cabeçalhos complexos (RF Balanças)

- Preferir **tabela fixa** no cabeçalho em vez de text boxes flutuantes.
- Logo **inline** na célula da tabela (não flutuante sobre o título).
- Metadados com **tab stops** Word nativos (Cód., Rev., Emissão, N.PÁG.).
- Se o save bloquear por regressão de header, use «Baixar original» e simplifique o modelo.

## Plano B

Se selective save não cobrir um template muito complexo:

- Manter ficheiro original via «Baixar original».
- Migrar para modelo Trevo simplificado (tabela no cabeçalho, sem caixas flutuantes).
