import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  getMasterDocument,
  listDocumentRevisions,
  listDocumentDistributions,
} from "@/lib/masterDocuments/masterDocumentsApi";
import {
  typeLabel,
  statusLabel,
} from "@/lib/masterDocuments/masterDocumentConstants";
import { getDueStatus, dueStatusLabel, dueStatusBadgeVariant } from "@/lib/masterDocuments/masterDocumentDueStatus";
import { masterDocumentListPath } from "@/lib/masterDocuments/masterDocumentRoutes";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import MasterDocumentFormDialog from "@/components/masterDocuments/MasterDocumentFormDialog";
import DocumentRevisionPanel from "@/components/masterDocuments/DocumentRevisionPanel";
import DocumentDistributionEditor from "@/components/masterDocuments/DocumentDistributionEditor";
import CriticalAnalysisDialog from "@/components/masterDocuments/CriticalAnalysisDialog";

export default function MasterDocumentDetailPage() {
  const { id } = useParams();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [doc, setDoc] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const load = useCallback(async () => {
    if (!currentTenantId || !id) return;
    setLoading(true);
    try {
      const [d, rev, dist, snap] = await Promise.all([
        getMasterDocument(currentTenantId, id),
        listDocumentRevisions(currentTenantId, id),
        listDocumentDistributions(currentTenantId, id),
        import("@/lib/masterDocuments/masterDocumentSnapshot").then((m) =>
          m.listSnapshotsForDocument(currentTenantId, id),
        ),
      ]);
      setDoc(d);
      setRevisions(rev);
      setDistributions(dist);
      setSnapshots(snap);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando…</div>;
  if (!doc) return <div className="p-8 text-center text-slate-500">Documento não encontrado.</div>;

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to={masterDocumentListPath()} className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Voltar à Lista Mestra
          </Link>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {doc.code && <span className="font-mono text-slate-500 mr-2">{doc.code}</span>}
            {doc.title}
          </h1>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge>{typeLabel(doc.type)}</Badge>
            <Badge variant="secondary">{statusLabel(doc.status)}</Badge>
            <span className="text-xs text-slate-500">Rev. {doc.current_revision} · Emissão {formatDateBr(doc.current_issue_date)}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setAnalysisOpen(true)}>Registrar análise crítica</Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}><PencilSimple size={16} className="mr-1" /> Editar</Button>
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados principais</TabsTrigger>
          <TabsTrigger value="revisoes">Revisões</TabsTrigger>
          <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
          <TabsTrigger value="exportacao">Exportação</TabsTrigger>
          <TabsTrigger value="gerados">Registros gerados</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Controle</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-slate-500">Referência:</span> {doc.reference || "—"}</p>
                <p><span className="text-slate-500">Categoria:</span> {doc.category || "—"}</p>
                <p><span className="text-slate-500">Módulo:</span> {doc.linked_module || "—"}</p>
                <p><span className="text-slate-500">Últ. análise crítica:</span> {formatDateBr(doc.last_critical_analysis_date)}</p>
                <p className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500">Próx. análise crítica:</span>
                  {formatDateBr(doc.next_critical_analysis_date)}
                  <Badge variant={dueStatusBadgeVariant(getDueStatus(doc.next_critical_analysis_date))} className="text-[10px]">
                    {dueStatusLabel(getDueStatus(doc.next_critical_analysis_date))}
                  </Badge>
                </p>
                {doc.critical_analysis_result && (
                  <p><span className="text-slate-500">Resultado:</span> {doc.critical_analysis_result}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Retenção e proteção</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-slate-500">Retenção:</span> {doc.retention_time ? `${doc.retention_time} ${doc.retention_unit}` : "—"}</p>
                <p><span className="text-slate-500">Local:</span> {doc.storage_location || "—"}</p>
                <p><span className="text-slate-500">Proteção:</span> {doc.protection_method || "—"}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revisoes" className="mt-4">
          <DocumentRevisionPanel
            tenantId={currentTenantId}
            masterDocumentId={id}
            revisions={revisions}
            onRefresh={load}
          />
        </TabsContent>

        <TabsContent value="distribuicao" className="mt-4">
          <DocumentDistributionEditor
            tenantId={currentTenantId}
            masterDocumentId={id}
            distributions={distributions}
            onRefresh={load}
          />
        </TabsContent>

        <TabsContent value="exportacao" className="mt-4">
          <Card>
            <CardContent className="pt-4 text-sm space-y-2">
              <p><span className="text-slate-500">Template:</span> <code className="text-xs">{doc.template_key || "—"}</code></p>
              <p><span className="text-slate-500">Regra de nome:</span> {doc.file_naming_rule || "—"}</p>
              <p><span className="text-slate-500">Padrão:</span> <code className="text-xs break-all">{doc.export_file_name_pattern || "—"}</code></p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gerados" className="mt-4">
          <Card>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr className="text-[10px] uppercase text-slate-500">
                  <th className="px-3 py-2 text-left">Arquivo</th>
                  <th className="px-3 py-2 text-left">Rev.</th>
                  <th className="px-3 py-2 text-left">Módulo</th>
                  <th className="px-3 py-2 text-left">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {snapshots.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-500">Nenhum registro gerado.</td></tr>
                )}
                {snapshots.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 text-xs truncate max-w-[200px]">{s.export_file_name}</td>
                    <td className="px-3 py-2">{s.document_revision}</td>
                    <td className="px-3 py-2 text-xs">{s.source_module}</td>
                    <td className="px-3 py-2 text-xs">{formatDateBr(s.generated_at?.slice?.(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      <CriticalAnalysisDialog
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        tenantId={currentTenantId}
        masterDocumentId={id}
        documentTitle={`${doc.code} — ${doc.title}`}
        onSaved={load}
      />
      <MasterDocumentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tenantId={currentTenantId}
        document={doc}
        onSaved={() => { setEditOpen(false); load(); }}
      />
    </div>
  );
}
