import React, { useCallback, useEffect, useState } from "react";
import { useFilteredPersonnelRows, usePersonnelTopicStatsEffect, personnelPanelCardClass } from "@/lib/personnelListPanelHelpers";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, PencilSimple, Copy, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  listAttendanceLists,
  duplicateAttendanceList,
  deleteAttendanceList,
} from "@/lib/personnelAttendanceListsApi";
import { exportAttendanceListPdf, exportAttendanceListDocx } from "@/lib/personnelExport";
import PersonnelExportMenu from "@/components/personnel/PersonnelExportMenu";
import { attendanceListEditorPath } from "@/lib/personnelRoutes";

function fmtDate(d) {
  if (!d) return "—";
  return d.slice(0, 10).split("-").reverse().join("/");
}

export default function AttendanceListsListPanel({
  tenantId,
  tenant,
  compact = false,
  externalFilters = null,
  topicId = "re-62d",
  onTopicStatsChange,
  onRecordsChange,
  loadEnabled = true,
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      setRows(await listAttendanceLists(tenantId));
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantId]);

  const reload = useCallback(async () => {
    await load();
    onRecordsChange?.();
  }, [load, onRecordsChange]);

  useEffect(() => { if (loadEnabled) load(); }, [load, loadEnabled]);

  const displayRows = useFilteredPersonnelRows(rows, externalFilters, topicId);
  usePersonnelTopicStatsEffect(displayRows, topicId, onTopicStatsChange);

  return (
    <Card className={personnelPanelCardClass(compact)}>
      <CardContent className={compact ? "p-0 space-y-4" : "p-4 space-y-4"}>
        <div className="flex justify-end">
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => navigate(attendanceListEditorPath("nova"))}>
            <Plus size={16} className="mr-1" /> Nova lista
          </Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-xs text-slate-600 text-left">
              <tr>
                <th className="p-2">Curso</th>
                <th className="p-2">Data</th>
                <th className="p-2">Duração</th>
                <th className="p-2">Instrutor</th>
                <th className="p-2">Participantes</th>
                <th className="p-2">Aprovados</th>
                <th className="p-2">Reprovados</th>
                <th className="p-2 w-36">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-slate-500">Nenhuma lista de presença.</td></tr>
              )}
              {displayRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.course_title}</td>
                  <td className="p-2">{fmtDate(r.course_date)}</td>
                  <td className="p-2">{r.duration_hours}</td>
                  <td className="p-2">{r.instructors}</td>
                  <td className="p-2">{r.concludes_count > 0 ? r.concludes_count : "—"}</td>
                  <td className="p-2">{r.approved_count}</td>
                  <td className="p-2">{r.reproved_count}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" asChild title="Editar" aria-label="Editar lista de presença"><Link to={attendanceListEditorPath(r.id)}><PencilSimple size={16} /></Link></Button>
                    <Button variant="ghost" size="sm" disabled={busy} title="Duplicar" aria-label="Duplicar lista de presença" onClick={async () => {
                      try {
                        const c = await duplicateAttendanceList(r.id, tenantId);
                        onRecordsChange?.();
                        navigate(attendanceListEditorPath(c.id));
                      } catch (e) { toast.error(e.message); }
                    }}><Copy size={16} /></Button>
                    <PersonnelExportMenu
                      disabled={busy}
                      onExportPdf={() => exportAttendanceListPdf(r.id, tenant)}
                      onExportDocx={() => exportAttendanceListDocx(r.id, tenant)}
                    />
                    <Button variant="ghost" size="sm" disabled={busy} title="Excluir" aria-label="Excluir lista de presença" onClick={async () => {
                      if (!window.confirm("Excluir esta lista?")) return;
                      try {
                        await deleteAttendanceList(r.id);
                        toast.success("Excluída");
                        await reload();
                      } catch (e) { toast.error(e.message); }
                    }}><Trash size={16} /></Button>
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
