import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, PencilSimple, Copy, FilePdf, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  listExperienceEvaluations,
  duplicateExperienceEvaluation,
  deleteExperienceEvaluation,
} from "@/lib/personnelExperienceEvaluationsApi";
import { exportExperienceEvaluationPdf } from "@/lib/personnelPdfExport";
import { experienceEvaluationEditorPath } from "@/lib/personnelRoutes";
import { EXPERIENCE_OPINION_LABELS, experienceResultLabel } from "@/lib/personnelExperienceConstants";

function fmtDate(d) {
  if (!d) return "—";
  return d.slice(0, 10).split("-").reverse().join("/");
}

export default function ExperienceEvaluationsListPanel({ tenantId, tenant }) {
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

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
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
                <th className="p-2">Data da Avaliação</th>
                <th className="p-2">Média</th>
                <th className="p-2">Parecer</th>
                <th className="p-2">Avaliador</th>
                <th className="p-2 w-36">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-slate-500">Nenhuma avaliação.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.occupant_name}</td>
                  <td className="p-2">{r.position_title}</td>
                  <td className="p-2">{fmtDate(r.admission_date)}</td>
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
                  <td className="p-2">
                    <Button variant="ghost" size="sm" asChild><Link to={experienceEvaluationEditorPath(r.id)}><PencilSimple size={16} /></Link></Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      try {
                        const c = await duplicateExperienceEvaluation(r.id, tenantId);
                        navigate(experienceEvaluationEditorPath(c.id));
                      } catch (e) { toast.error(e.message); }
                    }}><Copy size={16} /></Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      setBusy(true);
                      try {
                        await exportExperienceEvaluationPdf(r.id, tenant);
                        toast.success("PDF gerado");
                      } catch (e) { toast.error(e.message); }
                      finally { setBusy(false); }
                    }}><FilePdf size={16} /></Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                      if (!window.confirm("Excluir esta avaliação?")) return;
                      try {
                        await deleteExperienceEvaluation(r.id);
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
