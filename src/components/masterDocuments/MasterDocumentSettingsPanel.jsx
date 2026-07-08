import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  seedMasterDocumentsForTenant,
  findMasterDocumentByCode,
  listDocumentRevisions,
} from "@/lib/masterDocuments/masterDocumentsApi";
import { exportMasterDocumentListPdf } from "@/lib/masterDocumentPdf/exportMasterDocumentList";
import { masterDocumentDetailPath } from "@/lib/masterDocuments/masterDocumentRoutes";
import DocumentRevisionPanel from "./DocumentRevisionPanel";

export default function MasterDocumentSettingsPanel({ tenantId, tenant }) {
  const [busy, setBusy] = useState(false);
  const [listaDoc, setListaDoc] = useState(null);
  const [revisions, setRevisions] = useState([]);

  const loadLista = useCallback(async () => {
    if (!tenantId) return;
    try {
      const doc = await findMasterDocumentByCode(tenantId, "RE-8.3A");
      setListaDoc(doc);
      if (doc?.id) {
        setRevisions(await listDocumentRevisions(tenantId, doc.id));
      } else {
        setRevisions([]);
      }
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantId]);

  useEffect(() => { loadLista(); }, [loadLista]);

  const handleSeed = async () => {
    if (!window.confirm("Importar catálogo padrão da Lista Mestra? (apenas se ainda não existir)")) return;
    setBusy(true);
    try {
      await seedMasterDocumentsForTenant(tenantId);
      toast.success("Catálogo importado");
      loadLista();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleExportPdf = async () => {
    setBusy(true);
    try {
      await exportMasterDocumentListPdf(tenantId, tenant);
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e.message || "Falha na exportação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Catálogo padrão</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            A Lista Mestra reflete os documentos existentes no sistema (criados nos requisitos ou manualmente).
            O catálogo padrão é opcional e serve apenas como ponto de partida — entradas sem ficheiro real não aparecem na lista interna.
          </p>
          <Button onClick={handleSeed} disabled={busy} variant="outline">Importar catálogo padrão</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Exportação RE-8.3A</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Gera PDF da Lista Mestra de Documentos com histórico de revisões, distribuição e controles periódicos.</p>
          <Button onClick={handleExportPdf} disabled={busy}>Exportar Lista Mestra (PDF)</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Revisão da Lista Mestra (RE-8.3A)</CardTitle>
          {listaDoc?.id && (
            <Button variant="outline" size="sm" asChild>
              <Link to={masterDocumentDetailPath(listaDoc.id)}>Abrir detalhe</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!listaDoc && (
            <p className="text-sm text-slate-500">Documento RE-8.3A não encontrado. Importe o catálogo padrão.</p>
          )}
          {listaDoc && (
            <DocumentRevisionPanel
              tenantId={tenantId}
              masterDocumentId={listaDoc.id}
              revisions={revisions}
              onRefresh={loadLista}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
