# DOCX em procedimentos — docx-editor.dev

Editor: [@eigenpal/docx-editor-react](https://www.docx-editor.dev/docs/latest) (Apache 2.0).

## Pipeline

| Etapa | Comportamento |
|-------|---------------|
| **Upload** | Bytes intactos no Supabase Storage |
| **Edição (rota normal)** | `DocxEditor` em `mode="editing"`, toolbar ativa ao abrir `/document/:id` |
| **Só leitura** | Link «Visualizar» (`?mode=view`) → `readOnly` + `mode="viewing"`; «Editar» na barra restaura edição |
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

1. Abrir procedimento com `.docx` (`/document/:id`) → toolbar visível, texto editável
2. Editar parágrafo e «Salvar» → ficheiro atualizado; modo permanece editável
3. «Visualizar» (`?mode=view`) → só leitura; «Editar» na barra → edição
4. Upload/substituir Word → abre em edição
5. Export Word/PDF após edição
6. PR-6.6: alternar abas após voltar de solicitação
