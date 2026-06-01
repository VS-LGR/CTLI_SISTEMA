import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESPONSIBLE_ROLES } from "@/lib/roles";

function DocumentEditorMetaCard({
  title,
  version,
  code,
  responsible,
  reviewDate,
  readOnly,
  hasFile,
  fileName,
  docxDirty,
  responsibles,
  onPatch,
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="min-w-0">
          <Label className="text-xs uppercase tracking-wider text-slate-500">Título</Label>
          <Input
            className="mt-1"
            value={title || ""}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => onPatch("title", e.target.value)}
            data-testid="edit-title"
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs uppercase tracking-wider text-slate-500">Revisão</Label>
          <Input
            className="mt-1"
            value={version || ""}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => onPatch("version", e.target.value)}
            placeholder="Rev. 01"
            data-testid="edit-revision"
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs uppercase tracking-wider text-slate-500">Emissão</Label>
          <Input
            className="mt-1"
            type="date"
            value={code || ""}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => onPatch("code", e.target.value)}
            data-testid="edit-emission"
          />
        </div>
        <div className="min-w-0">
          <Label className="text-xs uppercase tracking-wider text-slate-500">Responsável</Label>
          <select
            value={responsible || ""}
            disabled={readOnly}
            onChange={(e) => onPatch("responsible", e.target.value)}
            className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white disabled:opacity-60"
            data-testid="edit-responsible"
          >
            <option value="">Selecione…</option>
            {responsibles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name} — {RESPONSIBLE_ROLES.find((x) => x.value === r.role)?.short}
              </option>
            ))}
            {responsible && !responsibles.some((r) => r.name === responsible) && (
              <option value={responsible}>{responsible} (não cadastrado)</option>
            )}
          </select>
        </div>
        <div className="min-w-0">
          <Label className="text-xs uppercase tracking-wider text-slate-500">Próxima revisão</Label>
          <Input
            className="mt-1"
            type="date"
            value={reviewDate || ""}
            readOnly={readOnly}
            disabled={readOnly}
            onChange={(e) => onPatch("review_date", e.target.value)}
            data-testid="edit-review-date"
          />
        </div>
        {hasFile && (
          <div className="text-xs bg-slate-50 border border-slate-200 rounded-md p-3 sm:col-span-2 xl:col-span-5 min-w-0">
            <div className="font-semibold text-slate-700 mb-1">Ficheiro Word</div>
            <div className="text-slate-600 truncate" title={fileName}>{fileName}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Edição nativa .docx com toolbar do editor. «Baixar original» = ficheiro do upload.
              Salvar usa gravação seletiva e valida cabeçalho/rodapé Word.
              PDF: impressão do editor (fundo branco). Use «Visualizar» na lista para só leitura.
              {docxDirty && (
                <span className="block mt-1 text-amber-700 font-medium">Alterações pendentes no Word.</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default React.memo(DocumentEditorMetaCard);
