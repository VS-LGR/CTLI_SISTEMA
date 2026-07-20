import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterPersonnelTopicRows } from "@/lib/personnelRegistrosListUtils";
import { personnelPanelCardClass } from "@/lib/personnelListPanelHelpers";
import { computePersonnelTopicStats } from "@/lib/personnelRegistrosListUtils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ListRowActionsMenu from "@/components/ui/ListRowActionsMenu";
import {
  Plus, PencilSimple, Copy, Prohibit, ArrowCounterClockwise, Trash, FilePdf, FileDoc,
} from "@phosphor-icons/react";
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
import { positionEditorPath } from "@/lib/personnelRoutes";
import PersonnelDeleteConfirmDialog from "@/components/personnel/PersonnelDeleteConfirmDialog";

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
              <th className="p-2 text-right w-[7.5rem]">Ações</th>
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
                <td className="p-2 text-right">
                  <ListRowActionsMenu
                    disabled={busy}
                    items={[
                      {
                        key: "edit",
                        label: "Editar",
                        icon: PencilSimple,
                        onSelect: () => navigate(positionEditorPath(r.id)),
                      },
                      ...(tab === "ativos"
                        ? [
                            {
                              key: "dup",
                              label: "Duplicar",
                              icon: Copy,
                              onSelect: async () => {
                                try {
                                  const c = await duplicatePosition(r.id, tenantId);
                                  toast.success("Duplicado");
                                  navigate(positionEditorPath(c.id));
                                } catch (e) { toast.error(e.message); }
                              },
                            },
                            {
                              key: "pdf",
                              label: "Exportar PDF",
                              icon: FilePdf,
                              onSelect: () => runExport(() => exportPositionCompetencyPdf(r.id, tenant), "pdf"),
                            },
                            {
                              key: "docx",
                              label: "Exportar Word",
                              icon: FileDoc,
                              onSelect: () => runExport(() => exportPositionCompetencyDocx(r.id, tenant), "docx"),
                            },
                            {
                              key: "inactivate",
                              label: "Inativar",
                              icon: Prohibit,
                              separatorBefore: true,
                              onSelect: async () => {
                                if (!window.confirm("Inativar este cargo? Ele será movido para Cargos obsoletos.")) return;
                                try {
                                  await inactivatePosition(r.id);
                                  toast.success("Cargo inativado");
                                  onReload();
                                } catch (e) { toast.error(e.message); }
                              },
                            },
                          ]
                        : [
                            {
                              key: "pdf",
                              label: "Exportar PDF",
                              icon: FilePdf,
                              onSelect: () => runExport(() => exportPositionCompetencyPdf(r.id, tenant), "pdf"),
                            },
                            {
                              key: "docx",
                              label: "Exportar Word",
                              icon: FileDoc,
                              onSelect: () => runExport(() => exportPositionCompetencyDocx(r.id, tenant), "docx"),
                            },
                            {
                              key: "reactivate",
                              label: "Reativar",
                              icon: ArrowCounterClockwise,
                              separatorBefore: true,
                              onSelect: async () => {
                                if (!window.confirm(`Reativar o cargo "${r.title}"?`)) return;
                                try {
                                  await reactivatePosition(r.id);
                                  toast.success("Cargo reativado");
                                  onReload();
                                } catch (e) { toast.error(e.message); }
                              },
                            },
                            {
                              key: "delete",
                              label: "Excluir permanentemente",
                              icon: Trash,
                              destructive: true,
                              onSelect: () => openDeleteDialog(r),
                            },
                          ]),
                    ]}
                  />
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
