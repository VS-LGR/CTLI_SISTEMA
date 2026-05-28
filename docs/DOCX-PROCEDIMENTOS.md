# DOCX em procedimentos — cabeçalho e formatação

## Diagnóstico (checklist)

| Sintoma | Hipótese provável | Confirmação |
|---------|-------------------|-------------|
| Cabeçalho OK no Word (“Baixar original”), quebrado no editor | H1 CSS do host / H3 zoom e margens | Comparar visual in-app vs Word desktop |
| Cabeçalho ausente só no PDF exportado da lista | H2 Mammoth / html2canvas (só corpo) | PDF sem abrir editor; ver aviso no PDF |
| Tabela do cabeçalho desalinhada em mobile | H1 + H3 `initialZoom` | Testar &lt; 640px |
| Após “Salvar”, piora no editor | H4 `editor.save()` ou reload | Comparar antes/depois de salvar |
| Logo/campos PAGE errados só em template complexo | H5 limitação biblioteca / modelo | Testar outro .docx simples |

## Pipeline

- **Upload:** bytes do `.docx` vão intactos para Supabase (`documentsApi.uploadFileSupabase`).
- **Edição:** `@eigenpal/docx-editor-react` carrega o buffer (`DocxEditorPanel.jsx`).
- **HTML (`content_html`):** Mammoth converte **apenas o corpo** — não inclui cabeçalho/rodapé Word (`docxImport.js`).
- **PDF rápido (lista):** `exportDocumentPdf` via HTML + aviso quando o ficheiro é `.docx` nativo.
- **PDF fiel:** no editor do documento, botão PDF abre a impressão do eigenpal (`print()`), que preserva layout Word.

## Ficheiros principais

| Ficheiro | Função |
|----------|--------|
| `src/components/documents/DocxEditorPanel.jsx` | Editor nativo + régua/margens |
| `src/lib/docxImport.js` | Mammoth (corpo); não usar como fonte de verdade para procedimentos |
| `src/lib/documentExport.js` | Export PDF/DOCX |
| `src/lib/docxEditorSave.js` | `save()` / `print()` do editor |
| `src/pages/DocumentEditor.jsx` | Save sem sobrescrever HTML via Mammoth |

## Modelo Trevo (fase 5)

Novo procedimento sem ficheiro usa `blankDocx.js` (sem cabeçalho institucional). Para layout Trevo completo:

1. Coloque `modelo-procedimento-trevo.docx` em `public/templates/` (ver README nessa pasta).
2. Na criação de documento, use **Modelo Word (Trevo)** para descarregar o ficheiro, ou envie o seu .docx via “Selecionar arquivo”.

Dependência `@eigenpal/docx-editor-react` está em **1.0.3** (última publicada no npm; inclui correções de cabeçalho/rodapé em tabelas).
