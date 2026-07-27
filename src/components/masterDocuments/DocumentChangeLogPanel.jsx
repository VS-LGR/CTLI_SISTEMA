import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listMasterDocumentChangeLogs, MASTER_DOCUMENT_CHANGE_ACTION_LABELS } from "@/lib/masterDocuments/masterDocumentChangeLog";
import { roleLabel } from "@/lib/roles";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

const ACTION_LABELS = MASTER_DOCUMENT_CHANGE_ACTION_LABELS;

function formatWhen(iso) {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const t = iso.slice(11, 16);
  return `${formatDateBr(d)}${t ? ` ${t}` : ""}`;
}

function changeEntries(changes) {
  if (!changes || typeof changes !== "object") return [];
  return Object.entries(changes).map(([field, diff]) => ({
    field,
    from: diff?.from ?? "—",
    to: diff?.to ?? "—",
  }));
}

export default function DocumentChangeLogPanel({ tenantId, masterDocumentId = null, limit = 100 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const data = await listMasterDocumentChangeLogs(tenantId, {
        masterDocumentId: masterDocumentId || undefined,
        limit,
      });
      setRows(data);
    } catch (e) {
      toast.error(e.message || "Falha ao carregar histórico de alterações");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, masterDocumentId, limit]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">Conta</th>
              <th className="px-3 py-2">Função</th>
              <th className="px-3 py-2">O que foi alterado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Carregando…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Nenhuma alteração registada.</td></tr>
            )}
            {rows.map((row) => {
              const entries = changeEntries(row.changes);
              return (
                <tr key={row.id} className="align-top">
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{formatWhen(row.created_at)}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {ACTION_LABELS[row.action] || row.action}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium text-slate-800">{row.user_full_name || "—"}</div>
                    <div className="text-slate-500">{row.user_email || "—"}</div>
                    <div className="text-slate-400">{roleLabel(row.user_role)}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{row.user_function || "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    <p className="text-slate-700 mb-1">{row.summary || "—"}</p>
                    {entries.length > 0 && (
                      <ul className="space-y-0.5 text-slate-500">
                        {entries.slice(0, 8).map((e) => (
                          <li key={e.field}>
                            <span className="font-mono text-[10px] text-slate-600">{e.field}</span>
                            {": "}
                            <span>{String(e.from)}</span>
                            {" → "}
                            <span className="text-slate-800">{String(e.to)}</span>
                          </li>
                        ))}
                        {entries.length > 8 && (
                          <li className="text-slate-400">+{entries.length - 8} campos…</li>
                        )}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
