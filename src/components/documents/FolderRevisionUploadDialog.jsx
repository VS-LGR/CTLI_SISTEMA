import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UPLOAD_ACTION_LABELS,
  canCommitUploadAction,
  decideUploadAction,
  parseUploadFileName,
  revisionFromVersion,
  uploadActionHint,
} from "@/lib/documents/documentUploadPlan";
import { findVigenteFileForMaster } from "@/lib/documentsApi";
import { getMasterDocument } from "@/lib/masterDocuments/masterDocumentsApi";

export default function FolderRevisionUploadDialog({
  open,
  onOpenChange,
  file,
  doc,
  tenantId,
  busy = false,
  onConfirm,
}) {
  const [revision, setRevision] = useState("");
  const [currentRevision, setCurrentRevision] = useState("");
  const [hasVigenteFile, setHasVigenteFile] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const parsed = parseUploadFileName(file?.name || "");
    setRevision(parsed.revision || "");
    setCurrentRevision(doc?.version || "");
    setHasVigenteFile(Boolean(doc?.status === "vigente" && doc?.has_file));
  }, [open, file, doc]);

  useEffect(() => {
    if (!open || !tenantId || !doc?.master_document_id) return undefined;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getMasterDocument(tenantId, doc.master_document_id),
      findVigenteFileForMaster(tenantId, doc.master_document_id),
    ]).then(([master, vigente]) => {
      if (cancelled) return;
      if (master?.current_revision) setCurrentRevision(master.current_revision);
      if (vigente) setHasVigenteFile(Boolean(vigente.has_file));
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, tenantId, doc]);

  const action = useMemo(() => decideUploadAction({
    matched: true,
    incomingRevision: revision,
    currentRevision,
    hasVigenteFile,
  }), [revision, currentRevision, hasVigenteFile]);

  const shownCurrent = currentRevision ? revisionFromVersion(currentRevision) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Revisão do ficheiro</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {doc?.title || "Documento"} está na revisão <span className="font-mono text-foreground">{loading ? "…" : shownCurrent}</span>.
            O vigente é sempre a revisão mais recente. As outras ficam no histórico.
          </p>
          <p className="text-xs text-muted-foreground truncate" title={file?.name}>{file?.name}</p>
          <div>
            <Label>Revisão deste ficheiro</Label>
            <Input className="mt-1 font-mono" value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="02" />
          </div>
          <p className="text-xs text-foreground/90">{uploadActionHint(action, currentRevision)}</p>
          <p className="text-xs font-medium">{UPLOAD_ACTION_LABELS[action]}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button
            type="button"
            disabled={busy || loading || !canCommitUploadAction(action)}
            onClick={() => onConfirm?.({ revision, action, currentRevision, hasVigenteFile })}
          >
            {busy ? "A guardar…" : "Confirmar envio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
