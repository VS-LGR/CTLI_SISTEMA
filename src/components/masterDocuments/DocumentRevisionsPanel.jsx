import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { listAllRevisions } from "@/lib/masterDocuments/masterDocumentsApi";
import { revisionStatusLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { revisionResponsibleName } from "@/lib/masterDocuments/masterDocumentsApi";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

export default function DocumentRevisionsPanel({ tenantId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setRows(await listAllRevisions(tenantId));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="overflow-x-auto border-slate-200">
      <table className="w-full text-sm min-w-[700px]">
        <thead className="bg-slate-50 border-b">
          <tr className="text-[10px] uppercase text-slate-500">
            <th className="px-3 py-2 text-left">Documento</th>
            <th className="px-3 py-2 text-left">Revisão</th>
            <th className="px-3 py-2 text-left">Emissão</th>
            <th className="px-3 py-2 text-left">Descrição</th>
            <th className="px-3 py-2 text-left">Responsável</th>
            <th className="px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading && <tr><td colSpan={6} className="p-6 text-center">Carregando…</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-mono text-xs">{r.master_document?.code} — {r.master_document?.title}</td>
              <td className="px-3 py-2">{r.revision_number}</td>
              <td className="px-3 py-2 text-xs">{formatDateBr(r.revision_date || r.issue_date)}</td>
              <td className="px-3 py-2 text-xs max-w-[200px] truncate">{r.change_description}</td>
              <td className="px-3 py-2 text-xs">{revisionResponsibleName(r)}</td>
              <td className="px-3 py-2 text-xs">{revisionStatusLabel(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
