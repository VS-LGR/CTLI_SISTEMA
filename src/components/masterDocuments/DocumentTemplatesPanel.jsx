import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listDocumentTemplateLinks } from "@/lib/masterDocuments/masterDocumentsApi";

export default function DocumentTemplatesPanel({ tenantId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setRows(await listDocumentTemplateLinks(tenantId));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="overflow-x-auto border-slate-200">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-slate-50 border-b">
          <tr className="text-[10px] uppercase text-slate-500">
            <th className="px-3 py-2 text-left">Documento</th>
            <th className="px-3 py-2 text-left">Template key</th>
            <th className="px-3 py-2 text-left">Módulo</th>
            <th className="px-3 py-2 text-left">Ativo</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading && <tr><td colSpan={4} className="p-6 text-center">Carregando…</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-mono text-xs">{r.master_document?.code}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.template_key}</td>
              <td className="px-3 py-2 text-xs">{r.module_name || r.master_document?.title}</td>
              <td className="px-3 py-2">
                <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Sim" : "Não"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
