import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { isSupabaseAuthMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, FilePdf, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  MONTH_SHORT,
  MONTH_KEYS,
  buildMaintenanceScheduleRows,
  ensureYearMaintenancePrograms,
  isMaintenanceMarkOverdue,
  markLabel,
  nextMarkStatus,
  updateYearIssuedApprovedBy,
  upsertMaintenanceMark,
} from "@/lib/maintenancePrograms/maintenanceProgramsApi";
import { downloadMaintenanceProgramPdf } from "@/lib/maintenancePrograms/downloadMaintenanceProgramPdf";
import { MAINTENANCE_PROGRAM_REQ_ID, MAINTENANCE_PROGRAM_FOLDER_KEY } from "@/lib/maintenanceProgramRoutes";
import RequirementFolderQuickAccess from "@/components/requirements/RequirementFolderQuickAccess";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";
import { fmtDmyShort } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";

function cellKey(kind, month) {
  return `${kind}:${month}`;
}

function cellClass(status, overdue) {
  if (status === "executado") {
    return "bg-emerald-600 text-white hover:bg-emerald-700";
  }
  if (status === "planejado") {
    return overdue
      ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-300 hover:bg-amber-100"
      : "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200 hover:bg-sky-100";
  }
  return "bg-white text-slate-300 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-400";
}

function MarkIcon({ status }) {
  if (status === "executado") {
    return <Check size={14} weight="bold" aria-hidden />;
  }
  if (status === "planejado") {
    return <Circle size={10} weight="fill" aria-hidden />;
  }
  return <Circle size={10} weight="regular" aria-hidden />;
}

export default function MaintenanceProgramPage({ embedded = false }) {
  const { currentTenantId, currentTenant } = useOutletContext();
  const [year, setYear] = useState(new Date().getFullYear());
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  const [issuedApprovedBy, setIssuedApprovedBy] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  const load = useCallback(async () => {
    if (!currentTenantId || !isSupabaseAuthMode) return;
    setLoading(true);
    try {
      const list = await ensureYearMaintenancePrograms(currentTenantId, year);
      setPrograms(list);
      const meta = list.find((p) => p.issued_approved_by)?.issued_approved_by || "";
      setIssuedApprovedBy(meta);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, year]);

  useEffect(() => { load(); }, [load]);

  const { rows, updatedAt } = useMemo(
    () => buildMaintenanceScheduleRows({ programs }),
    [programs],
  );

  const overdueCount = useMemo(() => {
    let n = 0;
    for (const row of rows) {
      for (const m of MONTH_KEYS) {
        if (isMaintenanceMarkOverdue(row.marks[m], year, m)) n += 1;
      }
    }
    return n;
  }, [rows, year]);

  const applyLocalMark = (kind, month, status) => {
    setPrograms((prev) => prev.map((p) => {
      if (p.equipment_kind !== kind) return p;
      const label = rows.find((r) => r.kind === kind)?.label || p.events?.[0]?.asset_label;
      const events = (p.events || []).filter(
        (e) => !(e.month === month && String(e.asset_label) === String(label)),
      );
      if (status) {
        events.push({
          id: `local-${kind}-${month}`,
          program_id: p.id,
          tenant_id: currentTenantId,
          asset_label: label,
          month,
          quarter: Math.ceil(month / 3),
          status,
          frequency: "trimestral",
        });
      }
      return { ...p, events };
    }));
  };

  const toggle = async (row, month) => {
    const key = cellKey(row.kind, month);
    if (pendingKeys.has(key)) return;
    const current = row.marks[month] || null;
    const next = nextMarkStatus(current);
    const snapshot = programs;

    setPendingKeys((prev) => new Set(prev).add(key));
    applyLocalMark(row.kind, month, next);

    try {
      await upsertMaintenanceMark({
        tenantId: currentTenantId,
        year,
        kind: row.kind,
        assetLabel: row.label,
        month,
        status: next,
      });
    } catch (e) {
      setPrograms(snapshot);
      toast.error(e.message);
    } finally {
      setPendingKeys((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    }
  };

  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      await updateYearIssuedApprovedBy(currentTenantId, year, issuedApprovedBy);
      toast.success("Responsável atualizado");
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingMeta(false);
    }
  };

  const handlePdf = async () => {
    try {
      await downloadMaintenanceProgramPdf({
        programs,
        year,
        rows,
        issuedApprovedBy,
        updatedAt,
        tenantId: currentTenantId,
        tenantName: currentTenant?.name || "",
        tenant: currentTenant,
      });
      toast.success("PDF gerado");
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!isSupabaseAuthMode || !currentTenantId) {
    return <p className="text-sm text-slate-500 p-8">Ligação Supabase e ambiente necessários.</p>;
  }

  return (
    <div className="space-y-6 max-w-[1600px] w-full min-w-0" data-testid="maintenance-program-page">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">PR-6.4.12 · RE-6.4.12A</div>
            <h1 className="font-display text-xl font-semibold text-slate-900 mt-1">Programa de Manutenção Preventiva</h1>
            <p className="text-sm text-slate-500 mt-1">
              Grelha anual por equipamento — clique no mês para alternar entre planejado e executado.
            </p>
          </div>
          <Button type="button" onClick={handlePdf} disabled={loading || !rows.length}>
            <FilePdf size={16} className="mr-1" /> Exportar PDF
          </Button>
        </div>
      )}
      {embedded && (
        <div className="flex justify-end">
          <Button type="button" onClick={handlePdf} disabled={loading || !rows.length}>
            <FilePdf size={16} className="mr-1" /> Exportar PDF
          </Button>
        </div>
      )}

      {!embedded && (
        <RequirementFolderQuickAccess
          requirementId={MAINTENANCE_PROGRAM_REQ_ID}
          folderKey={MAINTENANCE_PROGRAM_FOLDER_KEY}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">
          Ano
          <select
            className="ml-2 h-9 rounded border border-slate-200 bg-white px-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">Exibindo marcações de {year}.</span>
        {overdueCount > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-900 gap-1">
            <Warning size={12} /> {overdueCount} planejado(s) em atraso
          </Badge>
        )}
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-slate-50 min-w-[240px]">Equipamentos</th>
                {MONTH_SHORT.map((m) => (
                  <th key={m} className="p-2 text-center min-w-[56px]">{m}</th>
                ))}
              </tr>
              <tr className="border-t border-slate-200">
                <th className="p-1 sticky left-0 bg-slate-50" />
                <th colSpan={12} className="p-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {year}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="p-8 text-center text-slate-500">A carregar…</td></tr>
              ) : rows.map((r) => (
                <tr key={r.kind} className="border-t border-slate-100">
                  <td className="p-2 sticky left-0 bg-white font-medium max-w-[280px]">
                    <EllipsisTooltip label={r.label} className="block">{r.label}</EllipsisTooltip>
                  </td>
                  {MONTH_KEYS.map((m) => {
                    const status = r.marks[m] || null;
                    const overdue = isMaintenanceMarkOverdue(status, year, m);
                    const pending = pendingKeys.has(cellKey(r.kind, m));
                    return (
                      <td key={m} className="p-1.5 text-center">
                        <button
                          type="button"
                          disabled={pending}
                          title={
                            status === "executado"
                              ? "Executado — clique para limpar"
                              : status === "planejado"
                                ? "Planejado — clique para marcar como executado"
                                : "Sem marcação — clique para planejar"
                          }
                          aria-label={`${r.label} ${MONTH_SHORT[m - 1]}: ${markLabel(status)}`}
                          className={cn(
                            "h-8 w-8 rounded-md inline-flex items-center justify-center transition-colors",
                            cellClass(status, overdue),
                            pending && "opacity-60",
                          )}
                          onClick={() => toggle(r, m)}
                        >
                          <MarkIcon status={status} />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-slate-200 md:col-span-1">
          <CardContent className="p-4 space-y-2">
            <Label className="text-xs text-slate-500">Elaborado e aprovado por</Label>
            <div className="flex gap-2">
              <Input
                className="h-9"
                value={issuedApprovedBy}
                onChange={(e) => setIssuedApprovedBy(e.target.value)}
                placeholder="Nome"
              />
              <Button type="button" size="sm" className="h-9 shrink-0" disabled={savingMeta} onClick={saveMeta}>
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 text-sm text-slate-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Legenda</div>
            <div className="flex flex-wrap gap-4 items-center">
              <span className="inline-flex items-center gap-2">
                <span className="h-7 w-7 rounded-md bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200 inline-flex items-center justify-center">
                  <Circle size={10} weight="fill" />
                </span>
                Planejado
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-7 w-7 rounded-md bg-emerald-600 text-white inline-flex items-center justify-center">
                  <Check size={14} weight="bold" />
                </span>
                Executado
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 text-sm text-slate-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Última atualização</div>
            <div>{updatedAt ? fmtDmyShort(updatedAt) : "—"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
