import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, PencilSimple, Copy, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import { listAdequacies, duplicateAdequacy } from "@/lib/personnelAdequaciesApi";
import { exportAdequacyPdf } from "@/lib/personnelPdfExport";
import { adequacyEditorPath } from "@/lib/personnelRoutes";

function fmtDate(d) {
  if (!d) return "—";
  return d.slice(0, 10).split("-").reverse().join("/");
}

export default function AdequaciesListPanel({ tenantId, tenant }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      setRows(await listAdequacies(tenantId));
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => navigate(adequacyEditorPath("nova"))}>
            <Plus size={16} className="mr-1" /> Nova adequação
          </Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-xs text-slate-600 text-left">
              <tr>
                <th className="p-2">Matrícula</th>
                <th className="p-2">Ocupante</th>
                <th className="p-2">Cargo</th>
                <th className="p-2">Admissão</th>
                <th className="p-2">Última atualização</th>
                <th className="p-2">Supervisor</th>
                <th className="p-2">Responsável</th>
                <th className="p-2">Status</th>
                <th className="p-2 w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={9} className="p-4 text-center text-slate-500">Nenhuma adequação.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{r.registration_number}</td>
                  <td className="p-2">{r.occupant_name}</td>
                  <td className="p-2">{r.position_title}</td>
                  <td className="p-2">{fmtDate(r.admission_date)}</td>
                  <td className="p-2">{fmtDate(r.last_update_date)}</td>
                  <td className="p-2">{r.immediate_supervisor || "—"}</td>
                  <td className="p-2">{r.analysis_approval_responsible_name || "—"}</td>
                  <td className="p-2">{r.adequacy_status}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" asChild><Link to={adequacyEditorPath(r.id)}><PencilSimple size={16} /></Link></Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      try {
                        const c = await duplicateAdequacy(r.id, tenantId);
                        navigate(adequacyEditorPath(c.id));
                      } catch (e) { toast.error(e.message); }
                    }}><Copy size={16} /></Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      setBusy(true);
                      try {
                        await exportAdequacyPdf(r.id, tenant);
                        toast.success("PDF gerado");
                      } catch (e) { toast.error(e.message); }
                      finally { setBusy(false); }
                    }}><FilePdf size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
