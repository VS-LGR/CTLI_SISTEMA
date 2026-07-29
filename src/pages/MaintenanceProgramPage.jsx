import React, { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { isSupabaseAuthMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilePdf, Plus, PencilSimple, Trash, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  EQUIPMENT_VERIFICATION_KINDS,
  equipmentKindLabel,
} from "@/lib/equipmentVerifications/verificationChecklist";
import {
  QUARTER_LABELS,
  deleteMaintenanceEvent,
  ensureMaintenanceProgram,
  isMaintenanceEventOverdue,
  listMaintenancePrograms,
  upsertMaintenanceEvent,
} from "@/lib/maintenancePrograms/maintenanceProgramsApi";
import { downloadMaintenanceProgramPdf } from "@/lib/maintenancePrograms/downloadMaintenanceProgramPdf";
import { MAINTENANCE_PROGRAM_REQ_ID, MAINTENANCE_PROGRAM_FOLDER_KEY } from "@/lib/maintenanceProgramRoutes";
import RequirementFolderQuickAccess from "@/components/requirements/RequirementFolderQuickAccess";
import { fmtDmyShort } from "@/lib/dateFormat";

const emptyForm = () => ({
  id: null,
  asset_label: "",
  quarter: 1,
  frequency: "trimestral",
  status: "planejado",
  planned_date: "",
  executed_date: "",
  responsible: "",
  notes: "",
});

export default function MaintenanceProgramPage({ embedded = false }) {
  const { currentTenantId, currentTenant } = useOutletContext();
  const [year, setYear] = useState(new Date().getFullYear());
  const [kind, setKind] = useState("pesos");
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [programId, setProgramId] = useState(null);

  const load = useCallback(async () => {
    if (!currentTenantId || !isSupabaseAuthMode) return;
    setLoading(true);
    try {
      const list = await listMaintenancePrograms(currentTenantId, year);
      setPrograms(list);
      const current = list.find((p) => p.equipment_kind === kind);
      setProgramId(current?.id || null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, year, kind]);

  useEffect(() => { load(); }, [load]);

  const currentProgram = programs.find((p) => p.equipment_kind === kind);
  const events = currentProgram?.events || [];
  const overdue = events.filter(isMaintenanceEventOverdue).length;

  const openNew = async () => {
    try {
      const prog = await ensureMaintenanceProgram(currentTenantId, year, kind);
      setProgramId(prog.id);
      setForm(emptyForm());
      setOpen(true);
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const openEdit = (ev) => {
    setForm({
      id: ev.id,
      asset_label: ev.asset_label || "",
      quarter: ev.quarter || 1,
      frequency: ev.frequency || "trimestral",
      status: ev.status || "planejado",
      planned_date: ev.planned_date ? String(ev.planned_date).slice(0, 10) : "",
      executed_date: ev.executed_date ? String(ev.executed_date).slice(0, 10) : "",
      responsible: ev.responsible || "",
      notes: ev.notes || "",
    });
    setProgramId(ev.program_id || currentProgram?.id);
    setOpen(true);
  };

  const save = async () => {
    if (!form.asset_label.trim()) return toast.error("Informe o equipamento / identificação");
    let pid = programId;
    try {
      if (!pid) {
        const prog = await ensureMaintenanceProgram(currentTenantId, year, kind);
        pid = prog.id;
      }
      await upsertMaintenanceEvent({
        id: form.id || undefined,
        program_id: pid,
        tenant_id: currentTenantId,
        asset_label: form.asset_label.trim(),
        quarter: Number(form.quarter),
        frequency: form.frequency || "trimestral",
        status: form.status,
        planned_date: form.planned_date || null,
        executed_date: form.executed_date || null,
        responsible: form.responsible.trim(),
        notes: form.notes.trim(),
      });
      toast.success("Guardado");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async (ev) => {
    if (!window.confirm(`Remover ${ev.asset_label}?`)) return;
    try {
      await deleteMaintenanceEvent(ev.id);
      toast.success("Removido");
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handlePdf = async () => {
    try {
      let list = programs;
      if (!list.length) {
        list = await listMaintenancePrograms(currentTenantId, year);
      }
      await downloadMaintenanceProgramPdf({
        programs: list,
        year,
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
    <div className="space-y-6 max-w-[1400px] w-full min-w-0" data-testid="maintenance-program-page">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">PR-6.4.12 · RE-6.4.12A</div>
            <h1 className="font-display text-xl font-semibold text-slate-900 mt-1">Programa de Manutenção</h1>
            <p className="text-sm text-slate-500 mt-1">
              Frequência trimestral com estados Planejado e Executado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handlePdf}>
              <FilePdf size={16} className="mr-1" /> Exportar PDF
            </Button>
            <Button type="button" onClick={openNew}>
              <Plus size={16} className="mr-1" /> Novo evento
            </Button>
          </div>
        </div>
      )}
      {embedded && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handlePdf}>
            <FilePdf size={16} className="mr-1" /> Exportar PDF
          </Button>
          <Button type="button" onClick={openNew}>
            <Plus size={16} className="mr-1" /> Novo evento
          </Button>
        </div>
      )}

      {!embedded && (
        <RequirementFolderQuickAccess
          requirementId={MAINTENANCE_PROGRAM_REQ_ID}
          folderKey={MAINTENANCE_PROGRAM_FOLDER_KEY}
        />
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-slate-600">
          Ano
          <select
            className="ml-2 h-9 rounded border border-slate-200 bg-white px-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Tipo
          <select
            className="ml-2 h-9 rounded border border-slate-200 bg-white px-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {EQUIPMENT_VERIFICATION_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>
        {overdue > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-900 gap-1">
            <Warning size={12} /> {overdue} em atraso
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {QUARTER_LABELS.map((label, idx) => {
          const q = idx + 1;
          const qEvents = events.filter((e) => e.quarter === q);
          return (
            <Card key={label} className="border-slate-200">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">{label}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {!qEvents.length ? (
                  <p className="text-xs text-slate-400">Sem eventos</p>
                ) : qEvents.map((e) => (
                  <div
                    key={e.id}
                    className={`rounded border p-2 text-xs ${isMaintenanceEventOverdue(e) ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
                  >
                    <div className="font-medium text-slate-800">{e.asset_label}</div>
                    <div className="text-slate-500 mt-0.5">
                      {e.status === "executado" ? "Executado" : "Planejado"}
                      {e.planned_date ? ` · ${fmtDmyShort(e.planned_date)}` : ""}
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(e)}>
                        <PencilSimple size={14} />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => remove(e)}>
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">
            {equipmentKindLabel(kind)} — {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 text-left">
              <tr>
                <th className="p-2">Equipamento</th>
                <th className="p-2">Trimestre</th>
                <th className="p-2">Freq.</th>
                <th className="p-2">Status</th>
                <th className="p-2">Planejado</th>
                <th className="p-2">Executado</th>
                <th className="p-2">Responsável</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">A carregar…</td></tr>
              ) : !events.length ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">Nenhum evento neste tipo/ano.</td></tr>
              ) : events.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="p-2 font-medium">{e.asset_label}</td>
                  <td className="p-2">{QUARTER_LABELS[(e.quarter || 1) - 1]}</td>
                  <td className="p-2 capitalize">{e.frequency}</td>
                  <td className="p-2">
                    <Badge variant="secondary" className={e.status === "executado" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}>
                      {e.status === "executado" ? "Executado" : "Planejado"}
                    </Badge>
                  </td>
                  <td className="p-2 whitespace-nowrap">{fmtDmyShort(e.planned_date)}</td>
                  <td className="p-2 whitespace-nowrap">{fmtDmyShort(e.executed_date)}</td>
                  <td className="p-2">{e.responsible || "—"}</td>
                  <td className="p-2 text-right space-x-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(e)}><PencilSimple size={14} /></Button>
                    <Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => remove(e)}><Trash size={14} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar evento" : "Novo evento de manutenção"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="sm:col-span-2 space-y-1">
              <Label>Equipamento / identificação</Label>
              <Input value={form.asset_label} onChange={(e) => setForm((f) => ({ ...f, asset_label: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Trimestre</Label>
              <select
                className="w-full h-9 rounded border border-slate-200 bg-white px-2 text-sm"
                value={form.quarter}
                onChange={(e) => setForm((f) => ({ ...f, quarter: Number(e.target.value) }))}
              >
                {QUARTER_LABELS.map((l, i) => (
                  <option key={l} value={i + 1}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                className="w-full h-9 rounded border border-slate-200 bg-white px-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="planejado">Planejado</option>
                <option value="executado">Executado</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Data planejada</Label>
              <Input type="date" value={form.planned_date} onChange={(e) => setForm((f) => ({ ...f, planned_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Data executada</Label>
              <Input type="date" value={form.executed_date} onChange={(e) => setForm((f) => ({ ...f, executed_date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Responsável</Label>
              <Input value={form.responsible} onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Observações</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
