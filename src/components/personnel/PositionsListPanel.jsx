import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, PencilSimple, Copy, FilePdf, Prohibit } from "@phosphor-icons/react";
import { toast } from "sonner";
import { listPositions, duplicatePosition, inactivatePosition } from "@/lib/personnelPositionsApi";
import { exportPositionCompetencyPdf } from "@/lib/personnelPdfExport";
import { positionEditorPath } from "@/lib/personnelRoutes";

function fmtDate(d) {
  if (!d) return "—";
  return d.slice(0, 10).split("-").reverse().join("/");
}

export default function PositionsListPanel({ tenantId, tenant }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      setRows(await listPositions(tenantId));
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const exportPdf = async (id) => {
    setBusy(true);
    try {
      await exportPositionCompetencyPdf(id, tenant);
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <Button size="sm" className="bg-blue-600 text-white" onClick={() => navigate(`${positionEditorPath("nova")}`)}>
            <Plus size={16} className="mr-1" /> Novo cargo
          </Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">Cargo</th>
                <th className="p-2">Formação exigida</th>
                <th className="p-2">Formação desejável</th>
                <th className="p-2">Última atualização</th>
                <th className="p-2">Responsável</th>
                <th className="p-2">Status</th>
                <th className="p-2 w-40">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-slate-500">Nenhum cargo cadastrado.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 font-medium">{r.title}</td>
                  <td className="p-2">{r.required_education || "—"}</td>
                  <td className="p-2">{r.desired_education || "—"}</td>
                  <td className="p-2">{fmtDate(r.last_update_date)}</td>
                  <td className="p-2">{r.analysis_approval_responsible?.full_name || "—"}</td>
                  <td className="p-2 capitalize">{r.status}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={positionEditorPath(r.id)}><PencilSimple size={16} /></Link>
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                        try {
                          const c = await duplicatePosition(r.id, tenantId);
                          toast.success("Duplicado");
                          navigate(positionEditorPath(c.id));
                        } catch (e) { toast.error(e.message); }
                      }}><Copy size={16} /></Button>
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => exportPdf(r.id)}><FilePdf size={16} /></Button>
                      {r.status === "ativo" && (
                        <Button variant="ghost" size="sm" className="text-amber-700" onClick={async () => {
                          if (!window.confirm("Inativar este cargo?")) return;
                          try {
                            await inactivatePosition(r.id);
                            toast.success("Inativado");
                            load();
                          } catch (e) { toast.error(e.message); }
                        }}><Prohibit size={16} /></Button>
                      )}
                    </div>
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
