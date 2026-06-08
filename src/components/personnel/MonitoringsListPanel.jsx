import React, { useCallback, useEffect, useState } from "react";
import { useFilteredPersonnelRows, usePersonnelRowCountEffect, personnelPanelCardClass } from "@/lib/personnelListPanelHelpers";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, PencilSimple, Copy, FilePdf } from "@phosphor-icons/react";
import { toast } from "sonner";
import { listMonitorings, duplicateMonitoring } from "@/lib/personnelMonitoringsApi";
import { exportMonitoringPdf } from "@/lib/personnelPdfExport";
import { monitoringEditorPath } from "@/lib/personnelRoutes";

function fmtDate(d) {
  if (!d) return "—";
  return d.slice(0, 10).split("-").reverse().join("/");
}

export default function MonitoringsListPanel({
  tenantId,
  tenant,
  compact = false,
  externalFilters = null,
  topicId = "re-62e",
  onRowCountChange,
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      setRows(await listMonitorings(tenantId));
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const displayRows = useFilteredPersonnelRows(rows, externalFilters, topicId);
  usePersonnelRowCountEffect(displayRows, onRowCountChange);

  return (
    <Card className={personnelPanelCardClass(compact)}>
      <CardContent className={compact ? "p-0 space-y-4" : "p-4 space-y-4"}>
        <div className="flex justify-end">
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => navigate(monitoringEditorPath("nova"))}>
            <Plus size={16} className="mr-1" /> Novo monitoramento
          </Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-xs text-slate-600 text-left">
              <tr>
                <th className="p-2">Matrícula</th>
                <th className="p-2">Ocupante</th>
                <th className="p-2">Cargo</th>
                <th className="p-2">Motivo</th>
                <th className="p-2">Última atualização</th>
                <th className="p-2">Supervisor</th>
                <th className="p-2">Responsável</th>
                <th className="p-2">Próximo monitoramento</th>
                <th className="p-2">Adequado</th>
                <th className="p-2 w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && (
                <tr><td colSpan={10} className="p-4 text-center text-slate-500">Nenhum monitoramento.</td></tr>
              )}
              {displayRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{r.registration_number}</td>
                  <td className="p-2">{r.occupant_name}</td>
                  <td className="p-2">{r.position_title}</td>
                  <td className="p-2 max-w-[200px] truncate" title={r.monitoring_reason}>{r.monitoring_reason}</td>
                  <td className="p-2">{fmtDate(r.last_update_date)}</td>
                  <td className="p-2">{r.immediate_supervisor || "—"}</td>
                  <td className="p-2">{r.analysis_approval_responsible_name || "—"}</td>
                  <td className="p-2">{fmtDate(r.next_monitoring_date)}</td>
                  <td className="p-2 text-xs">{r.employee_remains_suitable || "—"}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" asChild><Link to={monitoringEditorPath(r.id)}><PencilSimple size={16} /></Link></Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      try {
                        const c = await duplicateMonitoring(r.id, tenantId);
                        navigate(monitoringEditorPath(c.id));
                      } catch (e) { toast.error(e.message); }
                    }}><Copy size={16} /></Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      setBusy(true);
                      try {
                        await exportMonitoringPdf(r.id, tenant);
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
