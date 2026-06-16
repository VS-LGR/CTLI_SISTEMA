import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { listGeneratedSnapshots } from "@/lib/masterDocuments/masterDocumentsApi";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

export default function DocumentSnapshotsPanel({ tenantId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setRows(await listGeneratedSnapshots(tenantId, { limit: 100 }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="overflow-x-auto border-slate-200">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-slate-50 border-b">
          <tr className="text-[10px] uppercase text-slate-500">
            <th className="px-3 py-2 text-left">Código</th>
            <th className="px-3 py-2 text-left">Rev.</th>
            <th className="px-3 py-2 text-left">Arquivo</th>
            <th className="px-3 py-2 text-left">Módulo</th>
            <th className="px-3 py-2 text-left">Gerado em</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading && <tr><td colSpan={5} className="p-6 text-center">Carregando…</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-mono text-xs">{r.document_code}</td>
              <td className="px-3 py-2">{r.document_revision}</td>
              <td className="px-3 py-2 text-xs max-w-[200px] truncate" title={r.export_file_name}>{r.export_file_name}</td>
              <td className="px-3 py-2 text-xs">{r.source_module}</td>
              <td className="px-3 py-2 text-xs">{formatDateBr(r.generated_at?.slice?.(0, 10) || r.generated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
