import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  seedMasterDocumentsForTenant,
  listDocumentRevisions,
} from "@/lib/masterDocuments/masterDocumentsApi";
import { findListaMestraDocument } from "@/lib/masterDocuments/findListaMestraDocument";
import {
  previewRemapDocumentFamily,
  remapDocumentFamily,
  normalizeCodeBase,
} from "@/lib/masterDocuments/remapDocumentFamily";
import { exportMasterDocumentListPdf } from "@/lib/masterDocumentPdf/exportMasterDocumentList";
import { masterDocumentDetailPath } from "@/lib/masterDocuments/masterDocumentRoutes";
import { clearProcedureLabelCache } from "@/lib/masterDocuments/procedureLabelResolver";
import DocumentRevisionPanel from "./DocumentRevisionPanel";

export default function MasterDocumentSettingsPanel({ tenantId, tenant }) {
  const [busy, setBusy] = useState(false);
  const [listaDoc, setListaDoc] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [fromBase, setFromBase] = useState("6.2");
  const [toBase, setToBase] = useState("");
  const [docTypes, setDocTypes] = useState("ambos");
  const [preview, setPreview] = useState(null);
  const [remapBusy, setRemapBusy] = useState(false);

  const loadLista = useCallback(async () => {
    if (!tenantId) return;
    try {
      const doc = await findListaMestraDocument(tenantId);
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

  const handlePreviewRemap = async () => {
    const from = normalizeCodeBase(fromBase);
    const to = normalizeCodeBase(toBase);
    if (!from || !to) {
      toast.error("Informe a base de origem e destino (ex.: 6.2 → 5.1)");
      return;
    }
    setRemapBusy(true);
    try {
      const data = await previewRemapDocumentFamily(tenantId, from, to, docTypes);
      setPreview(data);
      if (!data?.count) toast.message("Nenhum documento correspondente encontrado");
    } catch (e) {
      toast.error(e.message);
      setPreview(null);
    } finally {
      setRemapBusy(false);
    }
  };

  const handleApplyRemap = async () => {
    const from = normalizeCodeBase(fromBase);
    const to = normalizeCodeBase(toBase);
    if (!from || !to) {
      toast.error("Informe a base de origem e destino");
      return;
    }
    if (!preview?.count) {
      toast.error("Faça a pré-visualização antes de aplicar");
      return;
    }
    if (!window.confirm(
      `Remapear ${preview.count} documento(s) de ${from} para ${to}?\n\nRotas internas (ex.: pr-6-2) permanecem; apenas códigos e rótulos mudam.`,
    )) return;

    setRemapBusy(true);
    try {
      const result = await remapDocumentFamily(tenantId, from, to, docTypes);
      clearProcedureLabelCache(tenantId);
      toast.success(`${result.updated_documents || 0} documento(s) remapeado(s)`);
      setPreview(null);
      loadLista();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRemapBusy(false);
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
        <CardHeader><CardTitle className="text-base">Remapear família de códigos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Altera de uma vez todos os códigos PR/RE/MQ de uma base numérica no ambiente ativo
            (ex.: família 6.2 → 5.1). As pastas e rotas internas (pr-6-2) mantêm-se; os códigos exibidos e PDFs passam a usar a nova numeração.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>De (base)</Label>
              <Input value={fromBase} onChange={(e) => setFromBase(e.target.value)} placeholder="6.2" />
            </div>
            <div>
              <Label>Para (base)</Label>
              <Input value={toBase} onChange={(e) => setToBase(e.target.value)} placeholder="5.1" />
            </div>
            <div>
              <Label>Tipos</Label>
              <Select value={docTypes} onValueChange={setDocTypes}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambos">PR + RE + MQ</SelectItem>
                  <SelectItem value="pr">Só PR</SelectItem>
                  <SelectItem value="re">Só RE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handlePreviewRemap} disabled={remapBusy}>
              Pré-visualizar
            </Button>
            <Button onClick={handleApplyRemap} disabled={remapBusy || !preview?.count}>
              Aplicar remapeamento
            </Button>
          </div>
          {preview?.items?.length > 0 && (
            <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-left text-[10px] uppercase text-slate-500">
                    <th className="px-2 py-1">De</th>
                    <th className="px-2 py-1">Para</th>
                    <th className="px-2 py-1">Título</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1 font-mono">{item.from_code}</td>
                      <td className="px-2 py-1 font-mono">{item.to_code}</td>
                      <td className="px-2 py-1 truncate max-w-[200px]">{item.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Exportação RE-8.3A</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Gera PDF da Lista Mestra de Documentos com histórico de revisões, distribuição e controles periódicos.
            {listaDoc?.code ? ` Documento ativo: ${listaDoc.code}.` : ""}
          </p>
          <Button onClick={handleExportPdf} disabled={busy}>Exportar Lista Mestra (PDF)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            Revisão da Lista Mestra{listaDoc?.code ? ` (${listaDoc.code})` : " (RE-8.3A)"}
          </CardTitle>
          {listaDoc?.id && (
            <Button variant="outline" size="sm" asChild>
              <Link to={masterDocumentDetailPath(listaDoc.id)}>Abrir detalhe</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!listaDoc && (
            <p className="text-sm text-slate-500">Documento da Lista Mestra não encontrado. Importe o catálogo padrão.</p>
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
