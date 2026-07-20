import React, { useCallback, useEffect, useState } from "react";
import { useFilteredPersonnelRows, usePersonnelTopicStatsEffect, personnelPanelCardClass } from "@/lib/personnelListPanelHelpers";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ListRowActionsMenu from "@/components/ui/ListRowActionsMenu";
import { Plus, PencilSimple, Copy, Trash, FilePdf, FileDoc } from "@phosphor-icons/react";
import { toast } from "sonner";
import { listSelections, duplicateSelection, deleteSelection } from "@/lib/personnelSelectionsApi";
import { exportSelectionPdf, exportSelectionDocx } from "@/lib/personnelExport";
import { selectionEditorPath } from "@/lib/personnelRoutes";
import { selectionOpinionLabel } from "@/lib/personnelDisplayLabels";

function fmtDate(d) {
  if (!d) return "—";
  return d.slice(0, 10).split("-").reverse().join("/");
}

async function runExport(fn, format) {
  try {
    await fn();
    toast.success(format === "pdf" ? "PDF gerado" : "Word gerado");
  } catch (e) {
    toast.error(e.message || "Falha na exportação");
  }
}

export default function SelectionsListPanel({
  tenantId,
  tenant,
  compact = false,
  externalFilters = null,
  topicId = "re-62f",
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
      setRows(await listSelections(tenantId));
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
                <th className="p-2 text-right w-[7.5rem]">Ações</th>
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
                  <td className="p-2">{selectionOpinionLabel(r.conclusive_opinion_approved)}</td>
                  <td className="p-2">{r.analysis_approval_responsible_name || "—"}</td>
                  <td className="p-2 text-right">
                    <ListRowActionsMenu
                      disabled={busy}
                      items={[
                        {
                          key: "edit",
                          label: "Editar",
                          icon: PencilSimple,
                          onSelect: () => navigate(selectionEditorPath(r.id)),
                        },
                        {
                          key: "dup",
                          label: "Duplicar",
                          icon: Copy,
                          onSelect: async () => {
                            try {
                              const c = await duplicateSelection(r.id, tenantId);
                              onRecordsChange?.();
                              navigate(selectionEditorPath(c.id));
                            } catch (e) { toast.error(e.message); }
                          },
                        },
                        {
                          key: "pdf",
                          label: "Exportar PDF",
                          icon: FilePdf,
                          onSelect: () => runExport(() => exportSelectionPdf(r.id, tenant), "pdf"),
                        },
                        {
                          key: "docx",
                          label: "Exportar Word",
                          icon: FileDoc,
                          onSelect: () => runExport(() => exportSelectionDocx(r.id, tenant), "docx"),
                        },
                        {
                          key: "delete",
                          label: "Excluir",
                          icon: Trash,
                          destructive: true,
                          separatorBefore: true,
                          onSelect: async () => {
                            if (!window.confirm("Excluir esta seleção?")) return;
                            try {
                              await deleteSelection(r.id);
                              toast.success("Excluída");
                              await reload();
                            } catch (e) { toast.error(e.message); }
                          },
                        },
                      ]}
                    />
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
