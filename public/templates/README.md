# Modelo Word para procedimentos

Coloque aqui o ficheiro institucional Trevo com cabeçalho e rodapé já configurados:

- **Nome do ficheiro:** `modelo-procedimento-trevo.docx`
- **Uso:** botão «Modelo Word (Trevo)» na criação de procedimentos (lista de requisitos)

Sem este ficheiro, novos documentos usam um .docx vazio mínimo (`blankDocx.js`) sem cabeçalho institucional.

## Guia de modelo (fidelidade no editor)

Para maximizar compatibilidade com o editor Word no browser:

| Preferir | Evitar |
|----------|--------|
| Tabela fixa no cabeçalho | Text boxes flutuantes sobre o título |
| Logo inline numa célula | Imagem flutuante/ancorada sobre metadados |
| Tab stops Word (Cód., Rev., Emissão, N.PÁG.) | Posicionamento manual com espaços |
| Campos `PAGE` nativos | Numeração digitada à mão |
| Faixa de cor em célula de tabela | Shapes sobrepostos ao corpo |

## Fluxo recomendado

1. Descarregar ou usar este modelo Trevo.
2. Enviar `.docx` na criação do procedimento (upload intacto, sem conversão HTML).
3. Abrir no editor → modo visualização → «Editar Word» quando necessário.
4. Salvar alterações do corpo; cabeçalho/rodapé são validados automaticamente.
5. «Baixar original» recupera o ficheiro do Storage sem passar pelo editor.

Documentação completa: `docs/DOCX-PROCEDIMENTOS.md`.
