import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { listExternalDocuments, saveExternalDocument, deleteExternalDocument } from "@/lib/masterDocuments/masterDocumentsApi";
import { externalValidityLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import ExternalDocumentFormDialog from "./ExternalDocumentFormDialog";

export default function ExternalDocumentsPanel({ tenantId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

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
      <div className="flex justify-end">
        <Button onClick={() => { setEditRow(null); setFormOpen(true); }}>
          <Plus size={16} className="mr-1" /> Novo documento externo
        </Button>
      </div>
      <Card className="overflow-x-auto border-slate-200">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 border-b">
            <tr className="text-[10px] uppercase text-slate-500">
              <th className="px-3 py-2 text-left">Título</th>
              <th className="px-3 py-2 text-left">Órgão</th>
              <th className="px-3 py-2 text-left">Revisão</th>
              <th className="px-3 py-2 text-left">Última consulta</th>
              <th className="px-3 py-2 text-left">Próxima</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Carregando…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhum documento externo.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2 text-xs">{r.issuing_organization}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.external_revision}</td>
                <td className="px-3 py-2 text-xs">{formatDateBr(r.last_consultation_date)}</td>
                <td className="px-3 py-2 text-xs">{formatDateBr(r.next_consultation_date)}</td>
                <td className="px-3 py-2 text-xs">{externalValidityLabel(r.validity_status)}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setEditRow(r); setFormOpen(true); }}><PencilSimple size={16} /></Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(r.id)}>Excluir</Button>
                </td>
              </tr>
            ))}
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
    </div>
  );
}
