import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ListRowActionsMenu from "@/components/ui/ListRowActionsMenu";
import { Plus, PencilSimple, Trash, CalendarCheck } from "@phosphor-icons/react";
import { toast } from "sonner";
import { listExternalDocuments, saveExternalDocument, deleteExternalDocument } from "@/lib/masterDocuments/masterDocumentsApi";
import { externalValidityLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { getDueStatus, dueStatusLabel, dueStatusBadgeVariant } from "@/lib/masterDocuments/masterDocumentDueStatus";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import ExternalDocumentFormDialog from "./ExternalDocumentFormDialog";
import ExternalConsultationDialog from "./ExternalConsultationDialog";

export default function ExternalDocumentsPanel({ tenantId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [consultRow, setConsultRow] = useState(null);
  const [consultOpen, setConsultOpen] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setRows(await listExternalDocuments(tenantId));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir documento externo?")) return;
    try {
      await deleteExternalDocument(tenantId, id);
      toast.success("Excluído");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Consulta semestral de normas e legislações controladas.</p>
      <div className="flex justify-end">
        <Button onClick={() => { setEditRow(null); setFormOpen(true); }}>
          <Plus size={16} className="mr-1" /> Novo documento externo
        </Button>
      </div>
      <Card className="overflow-x-auto border-slate-200">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-slate-50 border-b">
            <tr className="text-[10px] uppercase text-slate-500">
              <th className="px-3 py-2 text-left">Título</th>
              <th className="px-3 py-2 text-left">Órgão</th>
              <th className="px-3 py-2 text-left">Revisão</th>
              <th className="px-3 py-2 text-left">Consulta ant.</th>
              <th className="px-3 py-2 text-left">Última consulta</th>
              <th className="px-3 py-2 text-left">Próxima</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right w-[7.5rem]">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={8} className="p-6 text-center text-slate-500">Carregando…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500">Nenhum documento externo.</td></tr>}
            {rows.map((r) => {
              const due = getDueStatus(r.next_consultation_date);
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2 text-xs">{r.issuing_organization}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.external_revision}</td>
                  <td className="px-3 py-2 text-xs">{formatDateBr(r.previous_consultation_date)}</td>
                  <td className="px-3 py-2 text-xs">{formatDateBr(r.last_consultation_date)}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      {formatDateBr(r.next_consultation_date)}
                      <Badge variant={dueStatusBadgeVariant(due)} className="text-[9px]">{dueStatusLabel(due)}</Badge>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{externalValidityLabel(r.validity_status)}</td>
                  <td className="px-3 py-2 text-right">
                    <ListRowActionsMenu
                      items={[
                        {
                          key: "consult",
                          label: "Consulta",
                          icon: CalendarCheck,
                          onSelect: () => { setConsultRow(r); setConsultOpen(true); },
                        },
                        {
                          key: "edit",
                          label: "Editar",
                          icon: PencilSimple,
                          onSelect: () => { setEditRow(r); setFormOpen(true); },
                        },
                        {
                          key: "delete",
                          label: "Excluir",
                          icon: Trash,
                          destructive: true,
                          separatorBefore: true,
                          onSelect: () => handleDelete(r.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <ExternalDocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenantId={tenantId}
        document={editRow}
        onSaved={() => { setFormOpen(false); load(); }}
      />
      <ExternalConsultationDialog
        open={consultOpen}
        onOpenChange={setConsultOpen}
        tenantId={tenantId}
        externalDoc={consultRow}
        onSaved={() => { setConsultOpen(false); load(); }}
      />
    </div>
  );
}
