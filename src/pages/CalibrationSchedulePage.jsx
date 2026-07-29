import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilePdf, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  buildCalibrationScheduleRows,
  listCalibrationScheduleOverrides,
  upsertCalibrationScheduleMark,
} from "@/lib/calibrationSchedule/calibrationScheduleApi";
import { downloadCalibrationSchedulePdf } from "@/lib/calibrationSchedule/downloadCalibrationSchedulePdf";
import { CALIBRATION_SCHEDULE_REQ_ID, CALIBRATION_SCHEDULE_FOLDER_KEY } from "@/lib/calibrationScheduleRoutes";
import RequirementFolderQuickAccess from "@/components/requirements/RequirementFolderQuickAccess";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function markKey(source, sourceId, year, month, markKind) {
  return `${source}:${sourceId}:${year}:${month}:${markKind}`;
}

function patchOverrides(list, nextRow) {
  const key = markKey(nextRow.source, nextRow.source_id, nextRow.year, nextRow.month, nextRow.mark_kind);
  let found = false;
  const out = (list || []).map((o) => {
    const k = markKey(o.source, o.source_id, o.year, o.month, o.mark_kind);
    if (k !== key) return o;
    found = true;
    return { ...o, ...nextRow };
  });
  if (!found) out.push(nextRow);
  return out;
}

export default function CalibrationSchedulePage({ embedded = false }) {
  const { currentTenantId, currentTenant } = useOutletContext();
  const [yearStart, setYearStart] = useState(new Date().getFullYear());
  const [weightCerts, setWeightCerts] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingKeys, setPendingKeys] = useState(() => new Set());

  const load = useCallback(async () => {
    if (!currentTenantId || !isSupabaseAuthMode) return;
    setLoading(true);
    try {
      const [wc, ec, ov] = await Promise.all([
        supabase.from("weight_standard_certificates").select("*").eq("tenant_id", currentTenantId).order("set_name"),
        supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", currentTenantId).order("equipment_name"),
        listCalibrationScheduleOverrides(currentTenantId, yearStart, 4),
      ]);
      if (wc.error) throw wc.error;
      if (ec.error) throw ec.error;
      setWeightCerts(wc.data || []);
      setEnvCerts(ec.data || []);
      setOverrides(ov || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, yearStart]);

  useEffect(() => { load(); }, [load]);

  const { years, rows } = useMemo(
    () => buildCalibrationScheduleRows({
      weightCertificates: weightCerts,
      envCertificates: envCerts,
      overrides,
      yearStart,
      yearCount: 4,
    }),
    [weightCerts, envCerts, overrides, yearStart],
  );

  const focusYear = years[0];
  const overdueCount = rows.filter((r) => r.overdue).length;

  const toggle = async (row, markKind, month) => {
    const key = markKey(row.source, row.sourceId, focusYear, month, markKind);
    if (pendingKeys.has(key)) return;

    const current = Boolean(row.marks?.[focusYear]?.[markKind]?.[month]);
    const nextMarked = !current;
    const optimistic = {
      tenant_id: currentTenantId,
      source: row.source,
      source_id: row.sourceId,
      year: focusYear,
      month,
      mark_kind: markKind,
      marked: nextMarked,
    };
    const snapshot = overrides;

    setPendingKeys((prev) => new Set(prev).add(key));
    setOverrides((prev) => patchOverrides(prev, optimistic));

    try {
      const saved = await upsertCalibrationScheduleMark({
        tenantId: currentTenantId,
        source: row.source,
        sourceId: row.sourceId,
        year: focusYear,
        month,
        markKind,
        marked: nextMarked,
      });
      setOverrides((prev) => patchOverrides(prev, saved));
    } catch (e) {
      setOverrides(snapshot);
      toast.error(e.message);
    } finally {
      setPendingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handlePdf = async () => {
    try {
      await downloadCalibrationSchedulePdf({
        yearStart,
        years,
        rows,
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
    <div className="space-y-6 max-w-[1600px] w-full min-w-0" data-testid="calibration-schedule-page">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">PR-6.4 · RE-6.4A</div>
            <h1 className="font-display text-xl font-semibold text-slate-900 mt-1">Cronograma de Calibração</h1>
            <p className="text-sm text-slate-500 mt-1">
              Agenda Previsto / Realizado por certificado (peso e thermo).
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
          requirementId={CALIBRATION_SCHEDULE_REQ_ID}
          folderKey={CALIBRATION_SCHEDULE_FOLDER_KEY}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">
          Ano inicial
          <select
            className="ml-2 h-9 rounded border border-slate-200 bg-white px-2 text-sm"
            value={yearStart}
            onChange={(e) => setYearStart(Number(e.target.value))}
          >
            {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">Exibindo marcações de {focusYear} (exportação PDF).</span>
        {overdueCount > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-900 gap-1">
            <Warning size={12} /> {overdueCount} vencido(s)
          </Badge>
        )}
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-slate-50 min-w-[200px]">Certificado</th>
                <th className="p-2 text-left min-w-[90px]">Situação</th>
                {MONTH_SHORT.map((m) => (
                  <th key={m} className="p-2 text-center min-w-[52px]">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="p-8 text-center text-slate-500">A carregar…</td></tr>
              ) : !rows.length ? (
                <tr><td colSpan={14} className="p-8 text-center text-slate-500">Nenhum certificado cadastrado.</td></tr>
              ) : rows.map((r) => (
                <React.Fragment key={`${r.source}-${r.sourceId}`}>
                  <tr className={`border-t border-slate-100 ${r.overdue ? "bg-amber-50/40" : ""}`}>
                    <td className="p-2 sticky left-0 bg-inherit font-medium max-w-[220px]" rowSpan={2}>
                      <EllipsisTooltip label={r.label} className="block">{r.label}</EllipsisTooltip>
                    </td>
                    <td className="p-2 text-slate-600">Previsto</td>
                    {MONTH_SHORT.map((_, i) => {
                      const m = i + 1;
                      const on = r.marks?.[focusYear]?.previsto?.[m];
                      const cellPending = pendingKeys.has(markKey(r.source, r.sourceId, focusYear, m, "previsto"));
                      return (
                        <td key={`p-${m}`} className="p-1 text-center">
                          <button
                            type="button"
                            disabled={cellPending}
                            aria-pressed={Boolean(on)}
                            aria-busy={cellPending}
                            className={`h-7 w-7 rounded text-xs font-semibold transition-opacity ${
                              on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                            } ${cellPending ? "opacity-60" : ""}`}
                            onClick={() => toggle(r, "previsto", m)}
                          >
                            {on ? "X" : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className={r.overdue ? "bg-amber-50/40" : ""}>
                    <td className="p-2 text-slate-600">Realizado</td>
                    {MONTH_SHORT.map((_, i) => {
                      const m = i + 1;
                      const on = r.marks?.[focusYear]?.realizado?.[m];
                      const cellPending = pendingKeys.has(markKey(r.source, r.sourceId, focusYear, m, "realizado"));
                      return (
                        <td key={`r-${m}`} className="p-1 text-center">
                          <button
                            type="button"
                            disabled={cellPending}
                            aria-pressed={Boolean(on)}
                            aria-busy={cellPending}
                            className={`h-7 w-7 rounded text-xs font-semibold transition-opacity ${
                              on ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                            } ${cellPending ? "opacity-60" : ""}`}
                            onClick={() => toggle(r, "realizado", m)}
                          >
                            {on ? "X" : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
