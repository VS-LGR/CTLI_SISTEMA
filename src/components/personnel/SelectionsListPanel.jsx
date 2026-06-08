import React, { useCallback, useEffect, useState } from "react";
import { useFilteredPersonnelRows, usePersonnelTopicStatsEffect, personnelPanelCardClass } from "@/lib/personnelListPanelHelpers";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, PencilSimple, Copy, FilePdf, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { listSelections, duplicateSelection, deleteSelection } from "@/lib/personnelSelectionsApi";
import { exportSelectionPdf } from "@/lib/personnelPdfExport";
import { selectionEditorPath } from "@/lib/personnelRoutes";

function fmtDate(d) {
  if (!d) return "—";
  return d.slice(0, 10).split("-").reverse().join("/");
}

export default function SelectionsListPanel({
  tenantId,
  tenant,
  compact = false,
  externalFilters = null,
  topicId = "pr-62f",
  onTopicStatsChange,
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      setRows(await listSelections(tenantId));
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const displayRows = useFilteredPersonnelRows(rows, externalFilters, topicId);
  usePersonnelTopicStatsEffect(displayRows, topicId, onTopicStatsChange);

  return (
    <Card className={personnelPanelCardClass(compact)}>
      <CardContent className={compact ? "p-0 space-y-4" : "p-4 space-y-4"}>
        <div className="flex justify-end">
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => navigate(selectionEditorPath("nova"))}>
            <Plus size={16} className="mr-1" /> Nova seleção
          </Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-xs text-slate-600 text-left">
              <tr>
                <th className="p-2">Data</th>
                <th className="p-2">Vaga</th>
                <th className="p-2">Candidato</th>
                <th className="p-2">Condutor</th>
                <th className="p-2">Parecer</th>
                <th className="p-2">Responsável</th>
                <th className="p-2 w-36">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-slate-500">Nenhuma seleção.</td></tr>
              )}
              {displayRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{fmtDate(r.selection_date)}</td>
                  <td className="p-2">{r.vacancy}</td>
                  <td className="p-2">{r.candidate_name}</td>
                  <td className="p-2">{r.selection_conductor_name || "—"}</td>
                  <td className="p-2">{r.conclusive_opinion_approved === true ? "Sim" : r.conclusive_opinion_approved === false ? "Não" : "—"}</td>
                  <td className="p-2">{r.analysis_approval_responsible_name || "—"}</td>
                  <td className="p-2">
                    <Button variant="ghost" size="sm" asChild><Link to={selectionEditorPath(r.id)}><PencilSimple size={16} /></Link></Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      try {
                        const c = await duplicateSelection(r.id, tenantId);
                        navigate(selectionEditorPath(c.id));
                      } catch (e) { toast.error(e.message); }
                    }}><Copy size={16} /></Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      setBusy(true);
                      try {
                        await exportSelectionPdf(r.id, tenant);
                        toast.success("PDF gerado");
                      } catch (e) { toast.error(e.message); }
                      finally { setBusy(false); }
                    }}><FilePdf size={16} /></Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      if (!window.confirm("Excluir esta seleção?")) return;
                      try {
                        await deleteSelection(r.id);
                        toast.success("Excluída");
                        load();
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
