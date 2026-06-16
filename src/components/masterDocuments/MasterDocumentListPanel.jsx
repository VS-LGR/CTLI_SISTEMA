import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, PencilSimple, Eye, Copy, Prohibit } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  listMasterDocuments,
  duplicateMasterDocument,
  markDocumentObsolete,
} from "@/lib/masterDocuments/masterDocumentsApi";
import {
  MASTER_DOCUMENT_TYPES,
  MASTER_DOCUMENT_STATUSES,
  MASTER_DOCUMENT_CATEGORIES,
  typeLabel,
  statusLabel,
} from "@/lib/masterDocuments/masterDocumentConstants";
import { masterDocumentDetailPath } from "@/lib/masterDocuments/masterDocumentRoutes";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { getDueStatus, dueStatusLabel, dueStatusBadgeVariant } from "@/lib/masterDocuments/masterDocumentDueStatus";
import MasterDocumentFormDialog from "./MasterDocumentFormDialog";
import ObsoleteDocumentDialog from "./ObsoleteDocumentDialog";

export default function MasterDocumentListPanel({ tenantId, filters: extraFilters = {} }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "all",
    category: "all",
    status: "all",
    search: "",
    ...extraFilters,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [obsoleteDoc, setObsoleteDoc] = useState(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await listMasterDocuments(tenantId, filters);
      setRows(data);
    } catch (e) {
      toast.error(e.message || "Falha ao carregar documentos");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters]);

  useEffect(() => { load(); }, [load]);

  const handleDuplicate = async (row) => {
    try {
      await duplicateMasterDocument(tenantId, row.id);
      toast.success("Documento duplicado");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleObsolete = async (data) => {
    try {
      await markDocumentObsolete(tenantId, obsoleteDoc.id, data);
      toast.success("Documento marcado como obsoleto");
      setObsoleteDoc(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <Input
          placeholder="Buscar código ou título…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="max-w-xs"
        />
        <Select value={filters.type} onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {MASTER_DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {MASTER_DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {MASTER_DOCUMENT_STATUSES.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditDoc(null); setFormOpen(true); }}>
          <Plus size={16} className="mr-1" /> Novo documento
        </Button>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Ref.</th>
                <th className="px-3 py-2">Rev.</th>
                <th className="px-3 py-2">Emissão</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Módulo</th>
                <th className="px-3 py-2">Próx. análise</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Carregando…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Nenhum documento encontrado.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2 font-mono text-xs">{row.code || "—"}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate" title={row.title}>{row.title}</td>
                  <td className="px-3 py-2 text-xs">{typeLabel(row.type)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.reference || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.current_revision}</td>
                  <td className="px-3 py-2 text-xs">{formatDateBr(row.current_issue_date)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.status === "ativo" ? "default" : "secondary"} className="text-[10px]">
                      {statusLabel(row.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs truncate max-w-[100px]">{row.linked_module || "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      {formatDateBr(row.next_critical_analysis_date)}
                      <Badge variant={dueStatusBadgeVariant(getDueStatus(row.next_critical_analysis_date))} className="text-[9px]">
                        {dueStatusLabel(getDueStatus(row.next_critical_analysis_date))}
                      </Badge>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild title="Ver">
                        <Link to={masterDocumentDetailPath(row.id)}><Eye size={16} /></Link>
                      </Button>
                      <Button variant="ghost" size="sm" title="Editar" onClick={() => { setEditDoc(row); setFormOpen(true); }}>
                        <PencilSimple size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" title="Duplicar" onClick={() => handleDuplicate(row)}>
                        <Copy size={16} />
                      </Button>
                      {row.status === "ativo" && (
                        <Button variant="ghost" size="sm" title="Obsoleto" onClick={() => setObsoleteDoc(row)}>
                          <Prohibit size={16} className="text-amber-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <MasterDocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenantId={tenantId}
        document={editDoc}
        onSaved={() => { setFormOpen(false); load(); }}
      />
      <ObsoleteDocumentDialog
        open={!!obsoleteDoc}
        onOpenChange={(o) => !o && setObsoleteDoc(null)}
        onConfirm={handleObsolete}
      />
    </div>
  );
}
