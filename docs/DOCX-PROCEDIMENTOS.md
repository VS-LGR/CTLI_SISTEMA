# DOCX em procedimentos — docx-editor.dev

Editor: [@eigenpal/docx-editor-react](https://www.docx-editor.dev/docs/latest) (Apache 2.0).

## Pipeline

| Etapa | Comportamento |
|-------|---------------|
| **Upload** | Bytes intactos no Supabase Storage |
| **Visualização** | `DocxEditor` em `mode="viewing"`, `showToolbar={false}` |
| **Edição** | Botão «Editar Word» → `mode="editing"` + remount via `key` |
| **Salvar** | `ref.save({ selective: true })` + validação header/footer (`docxSaveFidelity.js`) |
| **Baixar original** | Bytes do Storage (sem passar pelo editor) |
| **PDF** | `ref.print()` do editor + CSS print (`.docx-printing`) |

## Ficheiros principais

| Ficheiro | Função |
|----------|--------|
| `src/components/documents/DocxEditorPanel.jsx` | DocxEditor, dirty tracking, viewing/editing |
| `src/lib/docxSaveFidelity.js` | Save seletivo + fingerprints header/footer |
| `src/lib/docxEditorSave.js` | `saveDocxWithFidelity`, `printDocxFromEditor`, `relayoutDocxEditor` |
| `src/lib/tenantResponsiblesApi.js` | Responsáveis via Supabase |
| `src/pages/DocumentEditor.jsx` | Metadados + save/export |
| `src/pages/RequirementView.jsx` | Abas PR-6.6 com sync URL `?tab=` |

## Checklist QA

1. Upload `.docx` → visualização fiel (viewing)
2. «Editar Word» → toolbar ativa, texto editável
3. Salvar sem editar → Storage inalterado; responsável persiste
4. Salvar com edição → `.docx` atualizado, header validado
5. PDF via botão do editor
6. PR-6.6: alternar abas após voltar de solicitação
