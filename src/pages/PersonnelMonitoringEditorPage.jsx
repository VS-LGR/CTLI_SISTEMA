import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import MultiSelectStandardOptions from "@/components/personnel/MultiSelectStandardOptions";
import { createMonitoring, getMonitoring, updateMonitoring } from "@/lib/personnelMonitoringsApi";
import { listPositions } from "@/lib/personnelPositionsApi";
import { loadOptionsByCategory } from "@/lib/personnelStandardOptionsApi";
import { validateMonitoring } from "@/lib/personnelValidation";
import { emptyMonitoringForm } from "@/lib/personnelFormDefaults";
import { usePersonnelPrefill } from "@/hooks/usePersonnelPrefill";
import { exportMonitoringPdf, exportMonitoringDocx } from "@/lib/personnelExport";
import PersonnelExportMenu from "@/components/personnel/PersonnelExportMenu";
import { PERSONNEL_MONITORAMENTO_PATH } from "@/lib/personnelRoutes";

export default function PersonnelMonitoringEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTenantId, currentTenant } = useOutletContext();
  const isNew = id === "nova";
  const [form, setForm] = useState(emptyMonitoringForm);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [optionsByCategory, setOptionsByCategory] = useState({});
  const [busy, setBusy] = useState(false);
  const [lastMonitoringHint, setLastMonitoringHint] = useState("");

  const { onMonitoringEmployeeChange, onPositionChange } = usePersonnelPrefill({ employees, optionsByCategory });
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const trainingDetailsEnabled = form.needed_new_training === "Sim";

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    const [opts, em, pos] = await Promise.all([
      loadOptionsByCategory(currentTenantId),
      supabase.from("employee_registrations").select("*").eq("tenant_id", currentTenantId).order("full_name"),
      listPositions(currentTenantId, { status: "ativo" }),
    ]);
    setOptionsByCategory(opts);
    setEmployees(em.data || []);
    setPositions(pos);
    if (!isNew && id) {
      const row = await getMonitoring(id);
      setForm({
        ...emptyMonitoringForm(),
        ...row,
        admission_date: row.admission_date?.slice?.(0, 10) || "",
        last_update_date: row.last_update_date?.slice?.(0, 10) || "",
        next_monitoring_date: row.next_monitoring_date?.slice?.(0, 10) || "",
        occupation_authorization_date: row.occupation_authorization_date?.slice?.(0, 10) || "",
        last_interlaboratory_date: row.last_interlaboratory_date?.slice?.(0, 10) || "",
        last_intralaboratory_date: row.last_intralaboratory_date?.slice?.(0, 10) || "",
        document_model_issue_date: row.document_model_issue_date?.slice?.(0, 10) || "",
      });
    }
  }, [currentTenantId, id, isNew]);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);

  const save = async () => {
    const errors = validateMonitoring(form);
    if (errors.length) return toast.error(errors[0]);
    setBusy(true);
    try {
      const payload = {
        ...form,
        analysis_approval_responsible_id: form.analysis_approval_responsible_id || null,
      };
      if (isNew) {
        const row = await createMonitoring(currentTenantId, payload);
        toast.success("Monitoramento criado");
        navigate(`/pessoal/monitoramento/${row.id}`, { replace: true });
      } else {
        await updateMonitoring(id, currentTenantId, payload);
        toast.success("Guardado");
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 min-w-0">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild><Link to={PERSONNEL_MONITORAMENTO_PATH}><ArrowLeft size={18} /></Link></Button>
        <h1 className="text-xl font-bold">{isNew ? "Novo monitoramento" : "Monitoramento de pessoal"}</h1>
        {!isNew && (
          <PersonnelExportMenu
            variant="outline"
            className="ml-auto"
            disabled={busy}
            label="RE-6.2E"
            onExportPdf={() => exportMonitoringPdf(id, currentTenant)}
            onExportDocx={() => exportMonitoringDocx(id, currentTenant)}
          />
        )}
      </div>
      <Card><CardContent className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Colaborador *</Label>
            <select
              value={form.employee_id}
              onChange={async (e) => {
                const v = e.target.value;
                set("employee_id", v);
                const last = await onMonitoringEmployeeChange(v, setForm, {
                  tenantId: currentTenantId,
                  isNew,
                  excludeId: isNew ? undefined : id,
                });
                if (last?.last_update_date) {
                  const d = last.last_update_date.slice(0, 10).split("-").reverse().join("/");
                  setLastMonitoringHint(`Valores sugeridos com base no último monitoramento deste colaborador (${d}).`);
                } else {
                  setLastMonitoringHint("");
                }
              }}
              className="w-full border rounded-md h-10 px-3 text-sm"
            >
              <option value="">— Selecionar —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Cargo *</Label>
            <select
              value={form.position_id}
              onChange={(e) => {
                const v = e.target.value;
                set("position_id", v);
                onPositionChange(v, setForm);
              }}
              className="w-full border rounded-md h-10 px-3 text-sm"
            >
              <option value="">— Selecionar —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Matrícula</Label>
            <Input value={form.registration_number} onChange={(e) => set("registration_number", e.target.value)} className="h-10" />
          </div>
          <div>
            <Label>Motivo *</Label>
            <select value={form.monitoring_reason} onChange={(e) => set("monitoring_reason", e.target.value)} className="w-full border rounded-md h-10 px-3 text-sm">
              <option value="">—</option>
              {(optionsByCategory.monitoring_reason || []).map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <MultiSelectStandardOptions
          label="Métodos de monitoramento *"
          options={optionsByCategory.monitoring_method || []}
          value={form.monitoring_methods}
          onChange={(v) => set("monitoring_methods", v)}
        />
        <MultiSelectStandardOptions
          label="Treinamentos internos"
          options={optionsByCategory.internal_training || []}
          value={form.internal_trainings}
          onChange={(v) => set("internal_trainings", v)}
        />
        <MultiSelectStandardOptions
          label="Conhecimentos gerais"
          options={optionsByCategory.general_knowledge || []}
          value={form.general_knowledge}
          onChange={(v) => set("general_knowledge", v)}
        />
        <MultiSelectStandardOptions
          label="Conhecimento técnico"
          options={optionsByCategory.technical_knowledge || []}
          value={form.technical_knowledge}
          onChange={(v) => set("technical_knowledge", v)}
        />
        <MultiSelectStandardOptions
          label="Habilidades"
          options={optionsByCategory.skill || []}
          value={form.skills}
          onChange={(v) => set("skills", v)}
        />
        <MultiSelectStandardOptions
          label="Qualificações"
          options={optionsByCategory.qualification || []}
          value={form.qualification}
          onChange={(v) => set("qualification", v)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Houve necessidade de novos treinamentos? *</Label>
            <select
              value={form.needed_new_training}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  needed_new_training: val,
                  ...(val !== "Sim" ? { training_classification: "", training_topics: [] } : {}),
                }));
              }}
              className="w-full border rounded-md h-10 px-3 text-sm"
            >
              <option value="">—</option>
              {(optionsByCategory.training_need || []).map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Classificação</Label>
            <select
              value={form.training_classification}
              onChange={(e) => set("training_classification", e.target.value)}
              disabled={!trainingDetailsEnabled}
              className="w-full border rounded-md h-10 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">—</option>
              {(optionsByCategory.training_classification || []).map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <MultiSelectStandardOptions
          label="Treinamento em"
          options={optionsByCategory.internal_training || []}
          value={form.training_topics}
          onChange={(v) => set("training_topics", v)}
          disabled={!trainingDetailsEnabled}
        />

        {lastMonitoringHint && isNew && (
          <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">{lastMonitoringHint}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Autorização de ocupação do cargo</Label>
            <Input type="date" value={form.occupation_authorization_date} onChange={(e) => set("occupation_authorization_date", e.target.value)} className="h-10" />
          </div>
          <div>
            <Label>Último interlaboratorial</Label>
            <Input type="date" value={form.last_interlaboratory_date} onChange={(e) => set("last_interlaboratory_date", e.target.value)} className="h-10" />
          </div>
          <div>
            <Label>Último intralaboratorial</Label>
            <Input type="date" value={form.last_intralaboratory_date} onChange={(e) => set("last_intralaboratory_date", e.target.value)} className="h-10" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Funcionário se mantém adequado? *</Label>
            <select value={form.employee_remains_suitable} onChange={(e) => set("employee_remains_suitable", e.target.value)} className="w-full border rounded-md h-10 px-3 text-sm">
              <option value="">—</option>
              {(optionsByCategory.suitability_status || []).map((o) => (
                <option key={o.id} value={o.label}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Próximo monitoramento *</Label>
            <Input type="date" value={form.next_monitoring_date} onChange={(e) => set("next_monitoring_date", e.target.value)} className="h-10" />
          </div>
          <div>
            <Label>Última atualização *</Label>
            <Input type="date" value={form.last_update_date} onChange={(e) => set("last_update_date", e.target.value)} className="h-10" />
          </div>
          <div>
            <Label>Responsável pela análise</Label>
            <select
              value={form.analysis_approval_responsible_id || ""}
              onChange={(e) => {
                const emp = employees.find((x) => x.id === e.target.value);
                setForm((p) => ({
                  ...p,
                  analysis_approval_responsible_id: e.target.value,
                  analysis_approval_responsible_name: emp?.full_name || "",
                }));
              }}
              className="w-full border rounded-md h-10 px-3 text-sm"
            >
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => navigate(PERSONNEL_MONITORAMENTO_PATH)}>Cancelar</Button>
          <Button className="bg-blue-600 text-white" disabled={busy} onClick={save}>Guardar</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
