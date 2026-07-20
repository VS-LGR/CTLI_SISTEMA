import React, { useCallback, useEffect, useState } from "react";
import { useFilteredPersonnelRows, usePersonnelTopicStatsEffect, personnelPanelCardClass } from "@/lib/personnelListPanelHelpers";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ListRowActionsMenu from "@/components/ui/ListRowActionsMenu";
import { Plus, PencilSimple, Copy, Trash, FilePdf, FileDoc } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  listExperienceEvaluations,
  duplicateExperienceEvaluation,
  deleteExperienceEvaluation,
} from "@/lib/personnelExperienceEvaluationsApi";
import { exportExperienceEvaluationPdf, exportExperienceEvaluationDocx } from "@/lib/personnelExport";
import { experienceEvaluationEditorPath } from "@/lib/personnelRoutes";
import {
  EXPERIENCE_OPINION_LABELS,
  experienceResultLabel,
  resolveExperiencePeriodEndDate,
} from "@/lib/personnelExperienceConstants";

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

export default function ExperienceEvaluationsListPanel({
  tenantId,
  tenant,
  compact = false,
  externalFilters = null,
  topicId = "re-62b",
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
      setRows(await listExperienceEvaluations(tenantId));
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
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => navigate(experienceEvaluationEditorPath("nova"))}>
            <Plus size={16} className="mr-1" /> Nova avaliação
          </Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-xs text-slate-600 text-left">
              <tr>
                <th className="p-2">Colaborador</th>
                <th className="p-2">Cargo</th>
                <th className="p-2">Admissão</th>
                <th className="p-2">Fim do período</th>
                <th className="p-2">Data da Avaliação</th>
                <th className="p-2">Média</th>
                <th className="p-2">Parecer</th>
                <th className="p-2">Avaliador</th>
                <th className="p-2 text-right w-[7.5rem]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && (
                <tr><td colSpan={9} className="p-4 text-center text-slate-500">Nenhuma avaliação.</td></tr>
              )}
              {displayRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.occupant_name}</td>
                  <td className="p-2">{r.position_title}</td>
                  <td className="p-2">{fmtDate(r.admission_date)}</td>
                  <td className="p-2">
                    {fmtDate(resolveExperiencePeriodEndDate(r.admission_date, r.period_end_date))}
                  </td>
                  <td className="p-2">{fmtDate(r.evaluation_date)}</td>
                  <td className="p-2">{r.average_score ?? "—"}</td>
                  <td className="p-2">
                    {r.conclusive_opinion ? (
                      <span
                        title={EXPERIENCE_OPINION_LABELS[r.conclusive_opinion]}
                        className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                          r.conclusive_opinion === "aprovado"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {experienceResultLabel(r.conclusive_opinion)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-2">{r.evaluator_name || "—"}</td>
                  <td className="p-2 text-right">
                    <ListRowActionsMenu
                      disabled={busy}
                      items={[
                        {
                          key: "edit",
                          label: "Editar",
                          icon: PencilSimple,
                          onSelect: () => navigate(experienceEvaluationEditorPath(r.id)),
                        },
                        {
                          key: "dup",
                          label: "Duplicar",
                          icon: Copy,
                          onSelect: async () => {
                            try {
                              const c = await duplicateExperienceEvaluation(r.id, tenantId);
                              onRecordsChange?.();
                              navigate(experienceEvaluationEditorPath(c.id));
                            } catch (e) { toast.error(e.message); }
                          },
                        },
                        {
                          key: "pdf",
                          label: "Exportar PDF",
                          icon: FilePdf,
                          onSelect: () => runExport(() => exportExperienceEvaluationPdf(r.id, tenant), "pdf"),
                        },
                        {
                          key: "docx",
                          label: "Exportar Word",
                          icon: FileDoc,
                          onSelect: () => runExport(() => exportExperienceEvaluationDocx(r.id, tenant), "docx"),
                        },
                        {
                          key: "delete",
                          label: "Excluir",
                          icon: Trash,
                          destructive: true,
                          separatorBefore: true,
                          onSelect: async () => {
                            if (!window.confirm("Excluir esta avaliação?")) return;
                            try {
                              await deleteExperienceEvaluation(r.id);
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
