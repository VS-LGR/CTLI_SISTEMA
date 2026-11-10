import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { routeForMasterDocument } from "@/lib/documentFolderConfig";
import { commitRevisionUpload, findVigenteFileForMaster, formatDocumentError, listVigenteFilesForTenant } from "@/lib/documentsApi";
import { listMasterDocuments } from "@/lib/masterDocuments/masterDocumentsApi";
import {
  UPLOAD_ACTION_LABELS,
  canCommitUploadAction,
  decideUploadAction,
  normalizeDocumentCode,
  orderBatchUploads,
  parseUploadFileName,
  uploadActionHint,
} from "@/lib/documents/documentUploadPlan";

function findMaster(catalog, code) {
  const key = normalizeDocumentCode(code);
  if (!key) return null;
  return catalog.find((doc) => normalizeDocumentCode(doc.code) === key) || null;
}

function previewOf(row, catalog, vigenteByMaster) {
  const master = findMaster(catalog, row.code);
  const vigente = master ? vigenteByMaster[master.id] : null;
  const route = master ? routeForMasterDocument(master) : null;
  const action = !master || !route
    ? "pending_code"
    : decideUploadAction({
      matched: true,
      incomingRevision: row.revision,
      currentRevision: master.current_revision,
      hasVigenteFile: Boolean(vigente?.has_file),
    });
  return {
    ...row,
    master,
    masterId: master?.id || null,
    route,
    title: master?.title || "",
    currentRevision: master?.current_revision || "",
    destination: route?.folderKey || "",
    action,
  };
}

export default function MasterDocumentImportPanel({ tenantId, onImported }) {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [vigenteByMaster, setVigenteByMaster] = useState({});
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const previews = useMemo(
    () => rows.map((row) => previewOf(row, catalog, vigenteByMaster)),
    [rows, catalog, vigenteByMaster],
  );
  const readyCount = previews.filter((row) => canCommitUploadAction(row.action)).length;

  const ensureCatalog = async () => {
    if (!tenantId || catalog.length) return { catalog, vigenteByMaster };
    const docs = await listMasterDocuments(tenantId, { internalOnly: true });
    const vigentes = await listVigenteFilesForTenant(tenantId);
    const map = {};
    vigentes.forEach((doc) => {
      if (!doc.master_document_id) return;
      const current = map[doc.master_document_id];
      if (!current || (doc.has_file && !current.has_file)) map[doc.master_document_id] = doc;
    });
    setCatalog(docs);
    setVigenteByMaster(map);
    return { catalog: docs, vigenteByMaster: map };
  };

  const addFiles = async (fileList) => {
    const files = [...(fileList || [])].filter((file) => (
      file && (/pdf$/i.test(file.type || "") || /\.pdf$/i.test(file.name || ""))
    ));
    if (!files.length) {
      toast.error("Selecione ficheiros PDF.");
      return;
    }
    try {
      await ensureCatalog();
    } catch (err) {
      toast.error(formatDocumentError(err));
      return;
    }
    setRows((current) => {
      const next = [...current];
      files.forEach((file) => {
        const parsed = parseUploadFileName(file.name);
        const id = `${file.name}-${file.size}-${file.lastModified}-${next.length}`;
        next.push({
          id,
          file,
          fileName: file.name,
          code: parsed.code,
          revision: parsed.revision,
        });
      });
      return next;
    });
  };

  const patchRow = (id, patch) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const confirm = async () => {
    const batch = orderBatchUploads(previews).filter((row) => canCommitUploadAction(row.action));
    if (!batch.length) {
      toast.error("Nenhuma linha pronta. Confira o código e a revisão vigente.");
      return;
    }
    setBusy(true);
    let saved = 0;
    try {
      for (const row of batch) {
        const vigente = row.masterId ? await findVigenteFileForMaster(tenantId, row.masterId) : null;
        await commitRevisionUpload({
          tenant_id: tenantId,
          requirement: row.route.requirement,
          folder_key: row.route.folderKey,
          section: row.route.section,
          title: row.master.title || row.fileName,
          code: row.master.code,
          master_document_id: row.master.id,
          id: vigente?.id,
          status: vigente?.status,
          has_file: Boolean(vigente?.has_file),
          version: vigente?.version || row.master.current_revision,
        }, row.file, user?.id, { version: row.revision, action: row.action });
        saved += 1;
      }
      toast.success(saved === 1 ? "1 ficheiro importado." : `${saved} ficheiros importados.`);
      setRows([]);
      setCatalog([]);
      setVigenteByMaster({});
      onImported?.();
    } catch (err) {
      toast.error(formatDocumentError(err));
      if (saved) onImported?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4" data-tour="tour-lista-mestra-import">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Importar ficheiros</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Envio principal da Lista Mestra. Arraste vários PDFs. O nome pode trazer o código e a revisão
            (PR-6.3_Rev02, RE-6.2A Rev. 03). A revisão vigente aparece antes de gravar.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          <UploadSimple size={14} className="mr-1" /> Escolher PDFs
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground ${
          dragOver ? "border-primary bg-accent" : "border-border"
        }`}
      >
        Largue aqui os PDFs do lote
      </div>

      <div className="overflow-x-auto" data-tour="tour-lista-mestra-preview">
        {previews.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum ficheiro selecionado. A revisão vigente de cada documento aparece nesta tabela antes do envio.
          </p>
        ) : (
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-2">Ficheiro</th>
                <th className="px-2 py-2">Código</th>
                <th className="px-2 py-2">Revisão do ficheiro</th>
                <th className="px-2 py-2">Revisão vigente</th>
                <th className="px-2 py-2">Destino</th>
                <th className="px-2 py-2">Ação</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {previews.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-2 max-w-[180px] truncate" title={row.fileName}>{row.fileName}</td>
                  <td className="px-2 py-2">
                    <Input
                      value={row.code}
                      onChange={(e) => patchRow(row.id, { code: e.target.value.toUpperCase() })}
                      list="lista-mestra-codigos"
                      className="h-8 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      value={row.revision}
                      onChange={(e) => patchRow(row.id, { revision: e.target.value })}
                      className="h-8 w-24 font-mono text-xs"
                      placeholder="02"
                    />
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">{row.currentRevision || "—"}</td>
                  <td className="px-2 py-2 text-xs">{row.destination || "—"}</td>
                  <td className="px-2 py-2 text-xs" title={uploadActionHint(row.action, row.currentRevision)}>
                    {UPLOAD_ACTION_LABELS[row.action] || row.action}
                    {row.title ? <div className="text-muted-foreground truncate max-w-[160px]">{row.title}</div> : null}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>
                      Remover
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <datalist id="lista-mestra-codigos">
          {catalog.map((doc) => (
            <option key={doc.id} value={doc.code}>{doc.title}</option>
          ))}
        </datalist>
      </div>

      {previews.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {readyCount} de {previews.length} prontos para gravar. Revisão igual à vigente não é enviada.
          </p>
          <Button type="button" size="sm" onClick={confirm} disabled={busy || readyCount === 0}>
            {busy ? "A importar…" : "Confirmar importação"}
          </Button>
        </div>
      )}
    </div>
  );
}
