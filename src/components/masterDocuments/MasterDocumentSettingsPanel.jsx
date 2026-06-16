import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { seedMasterDocumentsForTenant } from "@/lib/masterDocuments/masterDocumentsApi";
import { exportMasterDocumentListPdf } from "@/lib/masterDocumentPdf/exportMasterDocumentList";

export default function MasterDocumentSettingsPanel({ tenantId, tenant }) {
  const [busy, setBusy] = useState(false);

  const handleSeed = async () => {
    if (!window.confirm("Importar catálogo padrão da Lista Mestra? (apenas se ainda não existir)")) return;
    setBusy(true);
    try {
      await seedMasterDocumentsForTenant(tenantId);
      toast.success("Catálogo importado");
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
    <div className="space-y-4 max-w-xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Catálogo padrão</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Importa procedimentos, registros e documentos externos conforme a Lista Mestra do SGQ.</p>
          <Button onClick={handleSeed} disabled={busy} variant="outline">Importar catálogo padrão</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Exportação RE-8.3A</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Gera PDF da Lista Mestra de Documentos.</p>
          <Button onClick={handleExportPdf} disabled={busy}>Exportar Lista Mestra (PDF)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
