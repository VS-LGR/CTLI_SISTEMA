import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { listDocumentDistributions } from "@/lib/masterDocuments/masterDocumentsApi";
import { copyTypeLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

export default function DocumentDistributionPanel({ tenantId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setRows(await listDocumentDistributions(tenantId));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Lista de distribuição de todos os documentos. Edite na página de detalhes de cada documento.</p>
      <Card className="overflow-x-auto border-slate-200">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 border-b">
            <tr className="text-[10px] uppercase text-slate-500">
              <th className="px-3 py-2 text-left">Área</th>
              <th className="px-3 py-2 text-left">Cópia nº</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Meio</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={6} className="p-6 text-center">Carregando…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhuma distribuição cadastrada.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">{r.area}</td>
                <td className="px-3 py-2">{r.copy_number ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{copyTypeLabel(r.copy_type)}</td>
                <td className="px-3 py-2 text-xs">{r.distribution_method}</td>
                <td className="px-3 py-2 text-xs">{formatDateBr(r.distribution_date)}</td>
                <td className="px-3 py-2 text-xs">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
