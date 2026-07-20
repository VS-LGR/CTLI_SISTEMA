import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PencilSimple, Eye, Copy, Prohibit, Trash } from "@phosphor-icons/react";
import ListRowActionsMenu from "@/components/ui/ListRowActionsMenu";
import { toast } from "sonner";
import {
  listMasterDocuments,
  duplicateMasterDocument,
  markDocumentObsolete,
} from "@/lib/masterDocuments/masterDocumentsApi";
import {
  deleteMasterDocumentCascade,
  getLinkedTenantDocumentCounts,
  isSystemPresentMasterDocument,
  listLinkedTenantDocuments,
} from "@/lib/masterDocuments/masterDocumentDeletion";
import PermanentDeleteDialog from "@/components/ui/PermanentDeleteDialog";
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
  const navigate = useNavigate();
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
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleteLinked, setDeleteLinked] = useState([]);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const systemOnly = extraFilters.systemOnly === true;

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await listMasterDocuments(tenantId, filters);
      if (systemOnly) {
        const counts = await getLinkedTenantDocumentCounts(tenantId);
        setRows(data.filter((d) => isSystemPresentMasterDocument(d, counts[d.id] || 0)));
      } else {
        setRows(data);
      }
    } catch (e) {
      toast.error(e.message || "Falha ao carregar documentos");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters, systemOnly]);

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

  const openDelete = async (row) => {
    setDeleteDoc(row);
    try {
      const linked = await listLinkedTenantDocuments(tenantId, row.id);
      setDeleteLinked(linked);
    } catch {
      setDeleteLinked([]);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteDoc) return;
    setDeleteBusy(true);
    try {
      const result = await deleteMasterDocumentCascade(tenantId, deleteDoc.id, { source: "lista_mestra" });
      toast.success(
        result.removedTenantDocuments
          ? `Documento removido (${result.removedTenantDocuments} ficheiro(s) SGQ também excluído(s))`
          : "Documento removido da Lista Mestra",
      );
      setDeleteDoc(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const deleteLabel = deleteDoc
    ? [deleteDoc.code, deleteDoc.title].filter(Boolean).join(" — ")
    : "";

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
                <th className="px-3 py-2 text-right w-[7.5rem]">Ações</th>
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
                    <ListRowActionsMenu
                      items={[
                        {
                          key: "view",
                          label: "Ver",
                          icon: Eye,
                          onSelect: () => navigate(masterDocumentDetailPath(row.id)),
                        },
                        {
                          key: "edit",
                          label: "Editar",
                          icon: PencilSimple,
                          onSelect: () => { setEditDoc(row); setFormOpen(true); },
                        },
                        {
                          key: "dup",
                          label: "Duplicar",
                          icon: Copy,
                          onSelect: () => handleDuplicate(row),
                        },
                        row.status === "ativo" && {
                          key: "obsolete",
                          label: "Marcar obsoleto",
                          icon: Prohibit,
                          separatorBefore: true,
                          onSelect: () => setObsoleteDoc(row),
                        },
                        {
                          key: "delete",
                          label: "Excluir",
                          icon: Trash,
                          destructive: true,
                          separatorBefore: row.status !== "ativo",
                          onSelect: () => openDelete(row),
                        },
                      ].filter(Boolean)}
                    />
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
      <PermanentDeleteDialog
        open={!!deleteDoc}
        onOpenChange={(o) => { if (!o && !deleteBusy) setDeleteDoc(null); }}
        title="Remover documento da Lista Mestra?"
        entityLabel={deleteLabel}
        busy={deleteBusy}
        onConfirm={handlePermanentDelete}
        description={(
          <p>
            O documento <strong>{deleteLabel}</strong> será removido permanentemente da Lista Mestra
            {deleteLinked.length > 0
              ? ` e ${deleteLinked.length} ficheiro(s) vinculado(s) nos requisitos SGQ também serão excluído(s)`
              : ""}.
            O registo da exclusão será guardado no histórico. Esta ação <strong>não pode ser desfeita</strong>.
          </p>
        )}
      />
    </div>
  );
}
