import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterPersonnelTopicRows } from "@/lib/personnelRegistrosListUtils";
import { personnelPanelCardClass } from "@/lib/personnelListPanelHelpers";
import { computePersonnelTopicStats } from "@/lib/personnelRegistrosListUtils";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, PencilSimple, Copy, Prohibit, ArrowCounterClockwise, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  listPositions,
  duplicatePosition,
  inactivatePosition,
  reactivatePosition,
  deletePositionPermanently,
  getPositionUsageCounts,
} from "@/lib/personnelPositionsApi";
import { exportPositionCompetencyPdf, exportPositionCompetencyDocx } from "@/lib/personnelExport";
import PersonnelExportMenu from "@/components/personnel/PersonnelExportMenu";
import { positionEditorPath } from "@/lib/personnelRoutes";
import PersonnelDeleteConfirmDialog from "@/components/personnel/PersonnelDeleteConfirmDialog";

function fmtDate(d) {
  if (!d) return "—";
  return d.slice(0, 10).split("-").reverse().join("/");
}

function PositionsTable({ rows, tenantId, tenant, busy, onBusy, onReload, tab }) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [usageCounts, setUsageCounts] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openDeleteDialog = async (row) => {
    try {
      const usage = await getPositionUsageCounts(row.id);
      setDeleteTarget(row);
      setUsageCounts(usage);
      setDeleteOpen(true);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="p-2">Cargo</th>
              <th className="p-2">Formação exigida</th>
              <th className="p-2">Formação desejável</th>
              <th className="p-2">Última atualização</th>
              <th className="p-2">Responsável</th>
              {tab === "ativos" && <th className="p-2">Status</th>}
              <th className="p-2 w-44">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={tab === "ativos" ? 7 : 6} className="p-4 text-center text-slate-500">
                  {tab === "ativos" ? "Nenhum cargo ativo." : "Nenhum cargo obsoleto."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-2 font-medium">{r.title}</td>
                <td className="p-2">{r.required_education || "—"}</td>
                <td className="p-2">{r.desired_education || "—"}</td>
                <td className="p-2">{fmtDate(r.last_update_date)}</td>
                <td className="p-2">{r.analysis_approval_responsible?.full_name || "—"}</td>
                {tab === "ativos" && <td className="p-2 capitalize">{r.status}</td>}
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={positionEditorPath(r.id)}><PencilSimple size={16} /></Link>
                    </Button>
                    {tab === "ativos" && (
                      <>
                        <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
                          try {
                            const c = await duplicatePosition(r.id, tenantId);
                            toast.success("Duplicado");
                            navigate(positionEditorPath(c.id));
                          } catch (e) { toast.error(e.message); }
                        }}><Copy size={16} /></Button>
                        <PersonnelExportMenu
                          disabled={busy}
                          onExportPdf={() => exportPositionCompetencyPdf(r.id, tenant)}
                          onExportDocx={() => exportPositionCompetencyDocx(r.id, tenant)}
                        />
                        <Button variant="ghost" size="sm" className="text-amber-700" onClick={async () => {
                          if (!window.confirm("Inativar este cargo? Ele será movido para Cargos obsoletos.")) return;
                          try {
                            await inactivatePosition(r.id);
                            toast.success("Cargo inativado");
                            onReload();
                          } catch (e) { toast.error(e.message); }
                        }}><Prohibit size={16} /></Button>
                      </>
                    )}
                    {tab === "obsoletos" && (
                      <>
                        <PersonnelExportMenu
                          disabled={busy}
                          onExportPdf={() => exportPositionCompetencyPdf(r.id, tenant)}
                          onExportDocx={() => exportPositionCompetencyDocx(r.id, tenant)}
                        />
                        <Button variant="ghost" size="sm" className="text-green-700" title="Reativar" onClick={async () => {
                          if (!window.confirm(`Reativar o cargo "${r.title}"?`)) return;
                          try {
                            await reactivatePosition(r.id);
                            toast.success("Cargo reativado");
                            onReload();
                          } catch (e) { toast.error(e.message); }
                        }}><ArrowCounterClockwise size={16} /></Button>
                        <Button variant="ghost" size="sm" className="text-red-700" title="Excluir permanentemente" onClick={() => openDeleteDialog(r)}>
                          <Trash size={16} />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PersonnelDeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir cargo permanentemente"
        description={`O cargo "${deleteTarget?.title}" será removido de forma definitiva. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir permanentemente"
        expectedText={deleteTarget?.title || ""}
        usageCounts={usageCounts}
        busy={busy}
        onConfirm={async () => {
          onBusy(true);
          try {
            await deletePositionPermanently(deleteTarget.id, tenantId);
            toast.success("Cargo excluído permanentemente");
            setDeleteOpen(false);
            setDeleteTarget(null);
            onReload();
          } catch (e) {
            toast.error(e.message);
          } finally {
            onBusy(false);
          }
        }}
      />
    </>
  );
}

export default function PositionsListPanel({
  tenantId,
  tenant,
  compact = false,
  externalFilters = null,
  topicId = "re-62c",
  onTopicStatsChange,
  onRecordsChange,
  loadEnabled = true,
}) {
  const navigate = useNavigate();
  const [activeRows, setActiveRows] = useState([]);
  const [obsoleteRows, setObsoleteRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("ativos");

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [active, obsolete] = await Promise.all([
        listPositions(tenantId, { status: "ativo" }),
        listPositions(tenantId, { status: "inativo", seedIfEmpty: false }),
      ]);
      setActiveRows(active);
      setObsoleteRows(obsolete);
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantId]);

  const reload = useCallback(async () => {
    await load();
    onRecordsChange?.();
  }, [load, onRecordsChange]);

  useEffect(() => { if (loadEnabled) load(); }, [load, loadEnabled]);

  const filterRows = useCallback((rows) => {
    if (!externalFilters?.query && !externalFilters?.date) return rows;
    return filterPersonnelTopicRows(rows, externalFilters, topicId);
  }, [externalFilters, topicId]);

  const displayActive = useMemo(() => filterRows(activeRows), [activeRows, filterRows]);
  const displayObsolete = useMemo(() => filterRows(obsoleteRows), [obsoleteRows, filterRows]);

  const positionStats = useMemo(
    () => computePersonnelTopicStats(topicId, [...displayActive, ...displayObsolete]),
    [displayActive, displayObsolete, topicId],
  );
  const onTopicStatsChangeRef = useRef(onTopicStatsChange);
  onTopicStatsChangeRef.current = onTopicStatsChange;

  const positionStatsSig = [
    positionStats.total,
    positionStats.attention,
    positionStats.activePositions,
    positionStats.obsoletePositions,
    positionStats.completedAdequacies,
    positionStats.draftAdequacies,
  ].join("|");

  useEffect(() => {
    onTopicStatsChangeRef.current?.(positionStats);
  }, [positionStats, positionStatsSig]);

  return (
    <Card className={personnelPanelCardClass(compact)}>
      <CardContent className={compact ? "p-0 space-y-4" : "p-4 space-y-4"}>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="ativos">Ativos ({displayActive.length})</TabsTrigger>
              <TabsTrigger value="obsoletos">Cargos obsoletos ({displayObsolete.length})</TabsTrigger>
            </TabsList>
            {tab === "ativos" && (
              <Button size="sm" className="bg-blue-600 text-white" onClick={() => navigate(positionEditorPath("nova"))}>
                <Plus size={16} className="mr-1" /> Novo cargo
              </Button>
            )}
          </div>

          <TabsContent value="ativos" className="mt-4">
            <PositionsTable
              rows={displayActive}
              tenantId={tenantId}
              tenant={tenant}
              busy={busy}
              onBusy={setBusy}
              onReload={reload}
              tab="ativos"
            />
          </TabsContent>

          <TabsContent value="obsoletos" className="mt-4">
            <p className="text-sm text-slate-600 mb-3">
              Cargos inativos podem ser reativados ou excluídos permanentemente (com confirmação dupla).
            </p>
            <PositionsTable
              rows={displayObsolete}
              tenantId={tenantId}
              tenant={tenant}
              busy={busy}
              onBusy={setBusy}
              onReload={reload}
              tab="obsoletos"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
