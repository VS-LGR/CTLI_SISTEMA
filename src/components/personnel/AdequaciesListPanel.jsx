import React, { useCallback, useEffect, useState } from "react";
import { useFilteredPersonnelRows, usePersonnelTopicStatsEffect, personnelPanelCardClass } from "@/lib/personnelListPanelHelpers";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ListRowActionsMenu from "@/components/ui/ListRowActionsMenu";
import { Plus, PencilSimple, Copy, FilePdf, FileDoc } from "@phosphor-icons/react";
import { toast } from "sonner";
import { listAdequacies, duplicateAdequacy } from "@/lib/personnelAdequaciesApi";
import { exportAdequacyPdf, exportAdequacyDocx } from "@/lib/personnelExport";
import { adequacyEditorPath } from "@/lib/personnelRoutes";
import { adequacyStatusLabel } from "@/lib/personnelDisplayLabels";

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

export default function AdequaciesListPanel({
  tenantId,
  tenant,
  compact = false,
  externalFilters = null,
  topicId = "re-62a",
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
      setRows(await listAdequacies(tenantId));
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantId]);

  useEffect(() => { if (loadEnabled) load(); }, [load, loadEnabled]);

  const displayRows = useFilteredPersonnelRows(rows, externalFilters, topicId);
  usePersonnelTopicStatsEffect(displayRows, topicId, onTopicStatsChange);

  return (
    <Card className={personnelPanelCardClass(compact)}>
      <CardContent className={compact ? "p-0 space-y-4" : "p-4 space-y-4"}>
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
                <th className="p-2 text-right w-[7.5rem]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && (
                <tr><td colSpan={9} className="p-4 text-center text-slate-500">Nenhuma adequação.</td></tr>
              )}
              {displayRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{r.registration_number}</td>
                  <td className="p-2">{r.occupant_name}</td>
                  <td className="p-2">{r.position_title}</td>
                  <td className="p-2">{fmtDate(r.admission_date)}</td>
                  <td className="p-2">{fmtDate(r.last_update_date)}</td>
                  <td className="p-2">{r.immediate_supervisor || "—"}</td>
                  <td className="p-2">{r.analysis_approval_responsible_name || "—"}</td>
                  <td className="p-2">{adequacyStatusLabel(r.adequacy_status)}</td>
                  <td className="p-2 text-right">
                    <ListRowActionsMenu
                      disabled={busy}
                      items={[
                        {
                          key: "edit",
                          label: "Editar",
                          icon: PencilSimple,
                          onSelect: () => navigate(adequacyEditorPath(r.id)),
                        },
                        {
                          key: "dup",
                          label: "Duplicar",
                          icon: Copy,
                          onSelect: async () => {
                            try {
                              const c = await duplicateAdequacy(r.id, tenantId);
                              onRecordsChange?.();
                              navigate(adequacyEditorPath(c.id));
                            } catch (e) { toast.error(e.message); }
                          },
                        },
                        {
                          key: "pdf",
                          label: "Exportar PDF",
                          icon: FilePdf,
                          onSelect: () => runExport(() => exportAdequacyPdf(r.id, tenant), "pdf"),
                        },
                        {
                          key: "docx",
                          label: "Exportar Word",
                          icon: FileDoc,
                          onSelect: () => runExport(() => exportAdequacyDocx(r.id, tenant), "docx"),
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
